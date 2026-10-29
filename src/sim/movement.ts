import type { SimGrid } from './grid';
import { cellOf } from './grid';
import { ONE, angleDiff, atan2Steps, clamp, fromAngle, idiv, isqrt, length, vadd, vsub, wrapAngle, type Vec } from './math';
import type { SimUnit } from './unit';

/** Facing error (angle steps) below which a vehicle drives at full speed. */
const FULL_SPEED_ANGLE = 256;
/** Facing error at or above which a vehicle stops and pivots in place. */
const PIVOT_ANGLE = 1024;
/** Distance (sim units) at which an intermediate waypoint counts as reached. */
const WAYPOINT_REACHED = 300;
/** Distance at which the final destination counts as reached. */
const ARRIVED = 20;

/**
 * Vehicle movement for one tick: turn toward the next waypoint at the unit's turn rate,
 * accelerate when facing roughly the right way (pivot in place when far off), brake into the
 * destination, then push overlapping units apart. Units are processed in ascending id order.
 */
export function stepMovement(units: SimUnit[], grid: SimGrid): void {
    for (const unit of units) drive(unit, grid);
    separate(units, grid);
}

function drive(unit: SimUnit, grid: SimGrid): void {
    // Skip intermediate waypoints already reached.
    while (unit.waypoints.length > 1 && length(vsub(unit.waypoints[0], unit.position)) <= Math.max(WAYPOINT_REACHED, unit.speed * 2)) {
        unit.waypoints.shift();
    }
    if (unit.waypoints.length === 0) {
        unit.speed = 0;
        return;
    }

    const target = unit.waypoints[0];
    const toTarget = vsub(target, unit.position);
    const distance = length(toTarget);
    const isLast = unit.waypoints.length === 1;
    if (isLast && distance <= Math.max(unit.speed, ARRIVED)) {
        unit.position = { ...target };
        unit.speed = 0;
        unit.waypoints = [];
        return;
    }

    const desired = atan2Steps(toTarget.y, toTarget.x);
    unit.heading = wrapAngle(unit.heading + clamp(angleDiff(unit.heading, desired), -unit.turnRate, unit.turnRate));

    const off = Math.abs(angleDiff(unit.heading, desired));
    let limit = unit.maxSpeed;
    if (off >= PIVOT_ANGLE) limit = 0;
    else if (off > FULL_SPEED_ANGLE) limit = idiv(unit.maxSpeed * (PIVOT_ANGLE - off), PIVOT_ANGLE - FULL_SPEED_ANGLE);
    if (isLast) {
        // Brake in time: v = sqrt(2 a d).
        limit = Math.min(limit, Math.max(unit.acceleration, isqrt(2 * unit.acceleration * distance)));
    }
    unit.speed = unit.speed < limit ? Math.min(limit, unit.speed + unit.acceleration) : Math.max(limit, unit.speed - unit.acceleration * 2);

    const next = vadd(unit.position, fromAngle(unit.heading, unit.speed));
    if (grid.isBlocked(cellOf(next))) unit.speed = 0;
    else unit.position = next;
}

/** Pushes overlapping units apart. Base vehicles are never pushed by smaller units. */
function separate(units: SimUnit[], grid: SimGrid): void {
    for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
            const a = units[i];
            const b = units[j];
            const delta = vsub(b.position, a.position);
            const distance = length(delta);
            const overlap = a.radius + b.radius - distance;
            if (overlap <= 0) continue;
            const dir = distance === 0 ? { x: ONE, y: 0 } : { x: idiv(delta.x * ONE, distance), y: idiv(delta.y * ONE, distance) };
            const push = { x: idiv(dir.x * overlap, ONE), y: idiv(dir.y * overlap, ONE) };
            if (a.isBase && !b.isBase) nudge(b, push, grid);
            else if (b.isBase && !a.isBase) nudge(a, { x: -push.x, y: -push.y }, grid);
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
