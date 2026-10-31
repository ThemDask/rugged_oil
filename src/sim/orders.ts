import { deliverLoad, insideReserve, isFull, loadTotal } from './economy';
import { insideCaptureArea } from './capture';
import { length, vsub } from './math';
import { planPath } from './pathing';
import type { Order, SimUnit } from './unit';
import type { SimWorld } from './world';

/**
 * Per-unit orders. The front of `unit.orders` is the current order; Shift-queued orders wait
 * behind it. Units never act on their own: an order ends when it's done and the unit stays put.
 * - move / attack-move: drive to the target (attack-move's fighting arrives with combat in M5);
 * - capture: drive into the point's square and stay until the point is ours;
 * - gather: drive to the reserve and extract. Hauling (League) extractors carry each full load
 *   to the HQ and come back. When the reserve is empty the extractor stops where it is (a
 *   hauler first delivers what it carries).
 */

/** Distance between a hauler and its HQ that counts as touching, on top of their radii (5 m). */
const TOUCH_GAP = 500;
/** Ticks between re-planning a path toward a moving HQ. */
const REPLAN_TICKS = 40;

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
        case 'attackMove':
            return unit.waypoints.length === 0 && unit.speedFx === 0;
        case 'attack':
            return true; // M5.
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
