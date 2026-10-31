import type { ArmourDef } from '../data/types';
import { cellOf } from './grid';
import { HALF_TURN, ONE, angleDiff, cosFx, fromAngle, idiv, sinFx, vadd, vsub, wrapAngle, type Vec } from './math';
import type { SimProjectile } from './state';
import type { SimUnit } from './unit';
import type { SimWorld } from './world';

/**
 * Projectiles (HLD "Projectiles and line of fire"): each flies in a straight line at its speed
 * until it hits an enemy unit (any enemy in its path, not only its target), hits an obstacle, or
 * has flown its maximum distance. It passes through friendly units (no friendly fire) and hits a
 * single unit (no splash). Hits are tested every metre along the path flown each tick, against
 * each unit's real rotated rectangle, so a long vehicle hit from the side is a bigger target.
 */

/** Distance between hit tests along a projectile's path, sim units (1 m). */
const HIT_STEP = 100;
/** Front and rear armour each cover ±45° around the hull's axis; the sides cover the rest. */
const FACING_HALF_ARC = 512;

export function stepProjectiles(world: SimWorld): void {
    for (const p of world.projectiles.values()) {
        if (p.dead) continue;
        const travel = Math.min(p.speed, p.distanceLeft);
        const steps = Math.max(1, idiv(travel + HIT_STEP - 1, HIT_STEP));
        const start = p.position;
        for (let i = 1; i <= steps && !p.dead; i++) {
            const at = vadd(start, fromAngle(p.direction, idiv(travel * i, steps)));
            p.position = at;
            if (world.grid.isBlocked(cellOf(at))) {
                p.dead = true;
                break;
            }
            const hit = unitAt(world, p, at);
            if (hit) {
                applyHit(world, p, hit);
                p.dead = true;
            }
        }
        p.distanceLeft -= travel;
        if (p.distanceLeft <= 0) p.dead = true;
    }
}

/** The first (lowest id) living enemy unit whose rectangle contains `at`. */
function unitAt(world: SimWorld, p: SimProjectile, at: Vec): SimUnit | undefined {
    for (const u of world.units.values()) {
        if (u.dead || !world.areEnemies(p.playerId, u.playerId)) continue;
        const d = vsub(at, u.position);
        if (Math.abs(d.x) > u.stats.radius * 2 || Math.abs(d.y) > u.stats.radius * 2) continue;
        // Into the unit's own frame: x along its hull, y across.
        const cos = cosFx(u.heading);
        const sin = sinFx(u.heading);
        const along = idiv(d.x * cos + d.y * sin, ONE);
        const across = idiv(-d.x * sin + d.y * cos, ONE);
        if (Math.abs(along) <= idiv(u.stats.length, 2) && Math.abs(across) <= idiv(u.stats.width, 2)) return u;
    }
    return undefined;
}

/** Which armour a shot meets: from the angle it comes from, relative to the target's hull. */
export function facingArmour(armour: ArmourDef, targetHeading: number, shotDirection: number): number {
    const from = wrapAngle(shotDirection + HALF_TURN);
    const relative = Math.abs(angleDiff(targetHeading, from));
    if (relative <= FACING_HALF_ARC) return armour.front;
    if (relative >= HALF_TURN - FACING_HALF_ARC) return armour.rear;
    return armour.side;
}

/** HLD damage: the piercing share goes through; armour blocks its percentage of the rest. */
export function damageAfterArmour(damage: number, piercing: number, armour: number): number {
    const piercingPart = idiv(damage * piercing, 100);
    const rest = damage - piercingPart;
    return piercingPart + rest - idiv(rest * armour, 100);
}

function applyHit(world: SimWorld, p: SimProjectile, target: SimUnit): void {
    const armour = facingArmour(target.stats.armour, target.heading, p.direction);
    target.health -= damageAfterArmour(p.damage, p.piercing, armour);
    if (target.health <= 0) {
        target.health = 0;
        target.dead = true;
    }
    // Remember who hit us (for idle units turning toward attackers).
    target.attackedBy = target.attackedBy.filter((a) => a.id !== p.sourceId);
    target.attackedBy.push({ id: p.sourceId, tick: world.tick });
    if (target.attackedBy.length > 4) target.attackedBy.shift();
}
