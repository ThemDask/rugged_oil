import { cellOf } from './grid';
import { turnToward } from './movement';
import { ONE, angleDiff, atan2Steps, clamp, fromAngle, idiv, length, vadd, vsub, wrapAngle, type Vec } from './math';
import type { SimUnit, WeaponState } from './unit';
import type { SimWorld } from './world';

/**
 * Combat (HLD "Combat" and "Unit behaviour"): every weapon sits on a mount that turns toward its
 * target at the mount's speed, only within its firing arc (centred on the hull's front). A
 * weapon fires at its target when the mount points at the aim point: where the target will be
 * when the projectile arrives, from its position, heading and speed. Targets: the unit's attack
 * order target if this weapon can reach it, otherwise (unless holding fire) the closest visible
 * enemy in range with a clear line of fire. Vehicles never move on their own; idle vehicles turn
 * their hull toward the closest visible attacker.
 */

/** A mount is on target when it points within this many angle steps (about 3°) of the aim point. */
const AIM_TOLERANCE = 32;
/** How long a hit is remembered for turning toward the attacker, ticks (5 s). */
export const ATTACKER_MEMORY = 100;

/** Whether `shooter` can see `target` (its tile is visible to the shooter's player). */
export function canSee(world: SimWorld, shooter: SimUnit, target: SimUnit): boolean {
    return world.isVisibleTo(shooter.playerId, target.position);
}

/** Whether a straight shot from `a` to `b` is clear of obstacles. */
export function clearShot(world: SimWorld, a: Vec, b: Vec): boolean {
    return world.grid.hasLine(cellOf(a), cellOf(b), 1);
}

/** Living, visible enemies of `unit`, in id order. */
export function visibleEnemies(world: SimWorld, unit: SimUnit): SimUnit[] {
    const out: SimUnit[] = [];
    for (const other of world.units.values()) {
        if (!other.dead && world.areEnemies(unit.playerId, other.playerId) && canSee(world, unit, other)) out.push(other);
    }
    return out;
}

/** True if any of the unit's weapons has a visible enemy in range with a clear shot. */
export function enemyInRange(world: SimWorld, unit: SimUnit): boolean {
    return unit.weapons.some((w) => pickTarget(world, unit, w) !== undefined);
}

/** The closest visible enemy this weapon could hit: in range, inside the mount's arc, clear shot. */
function pickTarget(world: SimWorld, unit: SimUnit, w: WeaponState): SimUnit | undefined {
    const candidates = visibleEnemies(world, unit)
        .map((e) => ({ e, d: length(vsub(e.position, unit.position)) }))
        .filter((c) => c.d <= w.weapon.range && inArc(unit, w, c.e.position))
        .sort((a, b) => a.d - b.d || a.e.id - b.e.id);
    return candidates.find((c) => clearShot(world, unit.position, c.e.position))?.e;
}

/** Whether a point lies inside the weapon mount's firing arc. */
function inArc(unit: SimUnit, w: WeaponState, at: Vec): boolean {
    const toTarget = vsub(at, unit.position);
    const relative = angleDiff(unit.heading, atan2Steps(toTarget.y, toTarget.x));
    return Math.abs(relative) <= w.mount.halfArc;
}

/** Where to aim so a projectile meets the target: its position plus its velocity × flight time. */
export function aimPoint(shooter: Vec, target: SimUnit, projectileSpeed: number): Vec {
    const velocity = fromAngle(target.heading, idiv(target.speedFx, ONE));
    let at = target.position;
    // Two refinements of the flight time are plenty at these speeds.
    for (let i = 0; i < 2; i++) {
        const flightTicks = idiv(length(vsub(at, shooter)), projectileSpeed);
        at = vadd(target.position, { x: velocity.x * flightTicks, y: velocity.y * flightTicks });
    }
    return at;
}

export function stepCombat(world: SimWorld): void {
    for (const unit of world.units.values()) {
        if (unit.dead) continue;
        if (unit.orders.length === 0) faceAttacker(world, unit);
        const order = unit.orders[0];
        const ordered = order?.type === 'attack' ? world.units.get(order.targetId) : undefined;
        for (const w of unit.weapons) {
            if (w.cooldown > 0) w.cooldown -= 1;
            let target: SimUnit | undefined;
            if (ordered && !ordered.dead && canSee(world, unit, ordered) && length(vsub(ordered.position, unit.position)) <= w.weapon.range
                && inArc(unit, w, ordered.position) && clearShot(world, unit.position, ordered.position)) {
                target = ordered;
            } else if (!unit.holdFire) {
                target = pickTarget(world, unit, w);
            }
            if (!target) {
                turnMount(w, 0); // Return to facing forward.
                continue;
            }
            const aim = aimPoint(unit.position, target, w.weapon.projectileSpeed);
            const toAim = vsub(aim, unit.position);
            const worldAngle = atan2Steps(toAim.y, toAim.x);
            const relative = clamp(angleDiff(unit.heading, worldAngle), -w.mount.halfArc, w.mount.halfArc);
            turnMount(w, relative);
            if (w.cooldown === 0 && Math.abs(angleDiff(w.mountAngle, relative)) <= AIM_TOLERANCE) {
                world.spawnProjectile(unit, wrapAngle(unit.heading + w.mountAngle), w);
                w.cooldown = w.weapon.cooldownTicks;
            }
        }
    }
}

/** Turns a mount toward a hull-relative angle at the mount's speed, staying inside its arc. */
function turnMount(w: WeaponState, relative: number): void {
    const budget = w.mount.turnRateFx + w.turnCarry;
    const steps = idiv(budget, ONE);
    w.turnCarry = budget - steps * ONE;
    const next = w.mountAngle + clamp(angleDiff(w.mountAngle, relative), -steps, steps);
    w.mountAngle = clamp(angleDiff(0, next), -w.mount.halfArc, w.mount.halfArc);
}

/** HLD: an idle unit turns slowly toward the closest visible attacker; attackers in fog get no reaction. */
function faceAttacker(world: SimWorld, unit: SimUnit): void {
    unit.attackedBy = unit.attackedBy.filter((a) => world.tick - a.tick <= ATTACKER_MEMORY);
    let closest: SimUnit | undefined;
    let best = 0;
    for (const a of unit.attackedBy) {
        const attacker = world.units.get(a.id);
        if (!attacker || attacker.dead || !canSee(world, unit, attacker)) continue;
        const d = length(vsub(attacker.position, unit.position));
        if (!closest || d < best || (d === best && attacker.id < closest.id)) {
            closest = attacker;
            best = d;
        }
    }
    if (!closest) return;
    const to = vsub(closest.position, unit.position);
    turnToward(unit, atan2Steps(to.y, to.x));
}
