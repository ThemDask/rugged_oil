import type { SizeClass } from '../data/types';
import type { SimGrid } from './grid';
import { cellOf } from './grid';
import { ONE, angleDiff, atan2Steps, clamp, fromAngle, idiv, isqrt, length, vadd, vsub, wrapAngle, type Vec } from './math';
import type { SimUnit } from './unit';

/** Facing error (angle steps) below which a vehicle drives at full speed. */
const FULL_SPEED_ANGLE = 256;
/** Facing error at or above which a vehicle stops and pivots in place (90°). */
const PIVOT_ANGLE = 1024;
/** Distance (sim units) at which an intermediate waypoint counts as reached. */
const WAYPOINT_REACHED = 300;
/** Distance at which the final destination counts as reached. */
const ARRIVED = 20;

/** Bigger classes are never pushed by smaller ones. */
const SIZE_RANK: Record<SizeClass, number> = { light: 0, medium: 1, heavy: 2, hq: 3 };

/**
 * Vehicle movement for one tick: turn toward the next waypoint at the unit's turn rate,
 * accelerate when facing roughly the right way (pivot in place when far off), brake into the
 * destination, then push overlapping units apart. Units are processed in ascending id order.
 */
export function stepMovement(units: SimUnit[], grid: SimGrid): void {
    for (const unit of units) drive(unit, grid);
    separate(units, grid);
}

/** Turns the hull toward `desired` by at most the unit's turn rate this tick. */
export function turnToward(unit: SimUnit, desired: number): void {
    const budget = unit.stats.turnRateFx + unit.turnCarry;
    const steps = idiv(budget, ONE);
    unit.turnCarry = budget - steps * ONE;
    unit.heading = wrapAngle(unit.heading + clamp(angleDiff(unit.heading, desired), -steps, steps));
}

function drive(unit: SimUnit, grid: SimGrid): void {
    const speed = idiv(unit.speedFx, ONE);
    // Skip intermediate waypoints already reached.
    while (unit.waypoints.length > 1 && length(vsub(unit.waypoints[0], unit.position)) <= Math.max(WAYPOINT_REACHED, speed * 2)) {
        unit.waypoints.shift();
    }
    if (unit.waypoints.length === 0) {
        unit.speedFx = 0;
        return;
    }

    const target = unit.waypoints[0];
    const toTarget = vsub(target, unit.position);
    const distance = length(toTarget);
    const isLast = unit.waypoints.length === 1;
    if (isLast && distance <= Math.max(speed, ARRIVED)) {
        unit.position = { ...target };
        unit.speedFx = 0;
        unit.waypoints = [];
        return;
    }

    const desired = atan2Steps(toTarget.y, toTarget.x);
    turnToward(unit, desired);

    const { topSpeedFx, accelerationFx } = unit.stats;
    const off = Math.abs(angleDiff(unit.heading, desired));
    let limit = topSpeedFx;
    if (off >= PIVOT_ANGLE) limit = 0;
    else if (off > FULL_SPEED_ANGLE) limit = idiv(topSpeedFx * (PIVOT_ANGLE - off), PIVOT_ANGLE - FULL_SPEED_ANGLE);
    if (isLast) {
        // Brake in time: v = sqrt(2 a d), all in fixed point.
        limit = Math.min(limit, Math.max(accelerationFx, isqrt(2 * accelerationFx * distance * ONE)));
    }
    unit.speedFx = unit.speedFx < limit ? Math.min(limit, unit.speedFx + accelerationFx) : Math.max(limit, unit.speedFx - accelerationFx * 2);

    const next = vadd(unit.position, fromAngle(unit.heading, idiv(unit.speedFx, ONE)));
    if (grid.isBlocked(cellOf(next))) unit.speedFx = 0;
    else unit.position = next;
}

/** Pushes overlapping units apart. A unit is never pushed by a smaller size class. */
function separate(units: SimUnit[], grid: SimGrid): void {
    for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
            const a = units[i];
            const b = units[j];
            const delta = vsub(b.position, a.position);
            const distance = length(delta);
            const overlap = a.stats.radius + b.stats.radius - distance;
            if (overlap <= 0) continue;
            const dir = distance === 0 ? { x: ONE, y: 0 } : { x: idiv(delta.x * ONE, distance), y: idiv(delta.y * ONE, distance) };
            const push = { x: idiv(dir.x * overlap, ONE), y: idiv(dir.y * overlap, ONE) };
            const rankA = SIZE_RANK[a.sizeClass];
            const rankB = SIZE_RANK[b.sizeClass];
            if (rankA > rankB) nudge(b, push, grid);
            else if (rankB > rankA) nudge(a, { x: -push.x, y: -push.y }, grid);
            else {
                const half = { x: idiv(push.x, 2), y: idiv(push.y, 2) };
                nudge(a, { x: -half.x, y: -half.y }, grid);
                nudge(b, { x: push.x - half.x, y: push.y - half.y }, grid);
            }
        }
    }
}

function nudge(unit: SimUnit, offset: Vec, grid: SimGrid): void {
    const next = vadd(unit.position, offset);
    if (!grid.isBlocked(cellOf(next))) unit.position = next;
}
