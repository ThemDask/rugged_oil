import { insideCaptureArea } from './capture';
import { canSee, clearShot, enemyInRange } from './combat';
import { deliverLoad, insideReserve, isFull, loadTotal } from './economy';
import { angleDiff, atan2Steps, length, vsub } from './math';
import { turnToward } from './movement';
import { planPath } from './pathing';
import type { Order, SimUnit } from './unit';
import type { SimWorld } from './world';

/**
 * Per-unit orders. The front of `unit.orders` is the current order; Shift-queued orders wait
 * behind it. Units never act on their own: an order ends when it's done and the unit stays put.
 * - move: drive to the target;
 * - attack-move: drive to the target, stopping to fight while a visible enemy is in range;
 * - attack: drive until the target is in range, then stay and fire; ends when the target dies or
 *   can't be seen any more;
 * - capture: drive into the point's square and stay until the point is ours;
 * - gather: drive to the reserve and extract. Hauling (League) extractors carry each full load
 *   to the HQ and come back. When the reserve is empty the extractor stops where it is (a
 *   hauler first delivers what it carries).
 */

/** Distance between a hauler and its HQ that counts as touching, on top of their radii (5 m). */
const TOUCH_GAP = 500;
/** Ticks between re-planning a path toward a moving HQ. */
const REPLAN_TICKS = 40;
/** A unit stuck this long (2 s) close to its destination counts as arrived... */
const STUCK_TICKS = 40;
/** ...if it's within this distance of it (50 m); further away, it plans a new path. */
const CLOSE_ENOUGH = 5000;

/** Gives a unit an order: replaces its orders, or appends when `queue` is set (Shift). */
export function giveOrder(world: SimWorld, unit: SimUnit, order: Order, queue: boolean): void {
    if (queue && unit.orders.length > 0) {
        unit.orders.push(order);
        return;
    }
    unit.orders = [order];
    startOrder(world, unit);
}

/** Advances every unit's current order; finished orders make way for the next queued one. */
export function stepOrders(world: SimWorld, units: SimUnit[]): void {
    for (const unit of units) {
        if (unit.dead) continue;
        if (unit.stuckTicks >= STUCK_TICKS) unstick(world, unit);
        if (orderDone(world, unit)) {
            unit.orders.shift();
            startOrder(world, unit);
        }
    }
}

/** Runs the current order for one tick; true when it's finished. */
function orderDone(world: SimWorld, unit: SimUnit): boolean {
    const order = unit.orders[0];
    if (!order) return false;
    switch (order.type) {
        case 'move':
            return unit.waypoints.length === 0 && unit.speedFx === 0;
        case 'attackMove':
            if (enemyInRange(world, unit)) {
                unit.waypoints = [];
                order.holding = true;
                return false;
            }
            if (order.holding) {
                order.holding = false;
                planPath(world.grid, unit, order.target);
                return false;
            }
            return unit.waypoints.length === 0 && unit.speedFx === 0;
        case 'attack':
            return stepAttack(world, unit, order.targetId);
        case 'capture': {
            const point = world.reqPoints.get(order.pointId);
            if (!point) return true;
            const settled = point.owner === unit.playerId && (point.capturer < 0 || point.progress === 0);
            if (settled) return true;
            // Driven there but not inside (e.g. pushed out): drive in again.
            if (unit.waypoints.length === 0 && unit.speedFx === 0 && !insideCaptureArea(world, point, unit.position)) planPath(world.grid, unit, order.target);
            return false;
        }
        case 'gather':
            return stepGather(world, unit, order);
    }
}

/**
 * Groups sent to the same spot can't all stand on it and push against each other. A unit that
 * has hardly moved for a while stops if it's close to its destination, or re-plans otherwise.
 */
function unstick(world: SimWorld, unit: SimUnit): void {
    unit.stuckTicks = 0;
    const destination = unit.waypoints[unit.waypoints.length - 1];
    if (!destination) return;
    if (length(vsub(destination, unit.position)) <= CLOSE_ENOUGH) {
        unit.waypoints = [];
        unit.speedFx = 0;
    } else {
        planPath(world.grid, unit, destination);
    }
}

/** Attack order: close in until a weapon is in range with a clear shot, then hold and face the target if no mount can reach it. */
function stepAttack(world: SimWorld, unit: SimUnit, targetId: number): boolean {
    const target = world.units.get(targetId);
    if (!target || target.dead || !canSee(world, unit, target)) return true;
    const distance = length(vsub(target.position, unit.position));
    const inRange = unit.weapons.some((w) => distance <= w.weapon.range) && clearShot(world, unit.position, target.position);
    const to = vsub(target.position, unit.position);
    if (inRange) {
        unit.waypoints = [];
        const angle = atan2Steps(to.y, to.x);
        const reachable = unit.weapons.some((w) => Math.abs(angleDiff(unit.heading, angle)) <= w.mount.halfArc);
        if (!reachable && unit.speedFx === 0) turnToward(unit, angle);
    } else if ((unit.waypoints.length === 0 && unit.speedFx === 0) || world.tick % REPLAN_TICKS === unit.id % REPLAN_TICKS) {
        planPath(world.grid, unit, target.position);
    }
    return false;
}

function stepGather(world: SimWorld, unit: SimUnit, order: Extract<Order, { type: 'gather' }>): boolean {
    const reserve = world.reserves.get(order.reserveId);
    const extraction = unit.stats.extraction;
    if (!reserve || !extraction) return true;
    const empty = reserve.amountLeft <= 0;

    switch (order.phase) {
        case 'toReserve':
            if (empty) return true;
            if (insideReserve(world, reserve, unit.position)) {
                order.phase = 'extracting';
                unit.waypoints = [];
            } else if (unit.waypoints.length === 0 && unit.speedFx === 0) {
                planPath(world.grid, unit, reserve.position);
            }
            return false;
        case 'extracting':
            if (extraction.mode === 'haul' && (isFull(unit, reserve.resource) || (empty && loadTotal(unit) > 0))) {
                order.phase = 'toHq';
                return !headToHq(world, unit);
            }
            return empty;
        case 'toHq': {
            const hq = world.hqOf(unit.playerId);
            if (!hq) return true;
            if (length(vsub(hq.position, unit.position)) <= hq.stats.radius + unit.stats.radius + TOUCH_GAP) {
                deliverLoad(world, unit);
                if (empty) return true;
                order.phase = 'toReserve';
                planPath(world.grid, unit, reserve.position);
            } else if ((unit.waypoints.length === 0 && unit.speedFx === 0) || world.tick % REPLAN_TICKS === unit.id % REPLAN_TICKS) {
                // The HQ may have moved: aim at where it is now.
                planPath(world.grid, unit, hq.position);
            }
            return false;
        }
    }
}

/** Plans a path to the player's HQ; false when there is no HQ. */
function headToHq(world: SimWorld, unit: SimUnit): boolean {
    const hq = world.hqOf(unit.playerId);
    if (!hq) return false;
    planPath(world.grid, unit, hq.position);
    return true;
}

/** Sets up the current order, e.g. plans the path for a move. */
function startOrder(world: SimWorld, unit: SimUnit): void {
    const order = unit.orders[0];
    unit.waypoints = [];
    if (!order) return;
    switch (order.type) {
        case 'move':
        case 'attackMove':
        case 'capture':
            planPath(world.grid, unit, order.target);
            break;
        case 'gather': {
            const reserve = world.reserves.get(order.reserveId);
            order.phase = 'toReserve';
            if (reserve) planPath(world.grid, unit, reserve.position);
            break;
        }
        case 'attack':
            break;
    }
}
