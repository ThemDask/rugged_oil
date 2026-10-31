import type { Resources } from '../data/types';
import type { CancelRecruitCommand, RecruitCommand } from './commands';
import { cellOf, clearanceFor } from './grid';
import { HALF_TURN, QUARTER_TURN, fromAngle, idiv, length, vadd, vsub, wrapAngle, type Vec } from './math';
import type { PlayerState } from './state';
import type { SimUnit } from './unit';
import type { SimWorld } from './world';

/**
 * HQ production (HLD "Production"): recruiting pays the full cost at once and queues the unit
 * (up to the queue size); units are recruited one at a time, each with its own timer; a queued
 * unit can be cancelled for a full refund; a finished unit spawns right next to the HQ, in the
 * first free spot. Queued units count toward the population cap.
 */

/** Gap left between the HQ and a newly spawned unit, sim units (2 m). */
const SPAWN_GAP = 200;
/** Spots tried for a new unit, relative to the HQ's heading: behind first, then the sides, then the front. */
const SPAWN_SPOTS: { angle: number; side: 'end' | 'side' | 'corner' }[] = [
    { angle: HALF_TURN, side: 'end' },
    { angle: HALF_TURN - 512, side: 'corner' },
    { angle: HALF_TURN + 512, side: 'corner' },
    { angle: QUARTER_TURN, side: 'side' },
    { angle: -QUARTER_TURN, side: 'side' },
    { angle: 512, side: 'corner' },
    { angle: -512, side: 'corner' },
    { angle: 0, side: 'end' },
];

export function canAfford(player: PlayerState, cost: Resources): boolean {
    return Object.entries(cost).every(([res, amount]) => (player.resources[res] ?? 0) >= amount);
}

export function pay(player: PlayerState, cost: Resources): void {
    for (const [res, amount] of Object.entries(cost)) player.resources[res] -= amount;
}

function refund(player: PlayerState, paid: Resources): void {
    for (const [res, amount] of Object.entries(paid)) player.resources[res] = (player.resources[res] ?? 0) + amount;
}

export function recruit(world: SimWorld, command: RecruitCommand): void {
    const player = world.players.get(command.playerId)!;
    const faction = world.data.faction(player.faction);
    if (!faction?.units.includes(command.unitDefId) || !world.hqOf(player.id)) return;
    const def = world.data.requireUnit(command.unitDefId);
    const stats = world.unitStatsOf(def.id);
    const rules = world.data.rules;
    if (player.queue.length >= rules.productionQueueSize) return;
    if (player.population + stats.population > rules.populationCap) return;
    if (!canAfford(player, def.cost)) return;
    pay(player, def.cost);
    player.population += stats.population;
    player.queue.push({ unitDefId: def.id, paid: { ...def.cost }, ticksLeft: stats.recruitTicks });
}

export function cancelRecruit(world: SimWorld, command: CancelRecruitCommand): void {
    const player = world.players.get(command.playerId)!;
    const entry = player.queue[command.index];
    if (!entry) return;
    refund(player, entry.paid);
    player.population -= world.unitStatsOf(entry.unitDefId).population;
    player.queue.splice(command.index, 1);
}

export function stepProduction(world: SimWorld): void {
    for (const player of world.players.values()) {
        const entry = player.queue[0];
        const hq = world.hqOf(player.id);
        if (!entry || !hq) continue;
        if (entry.ticksLeft > 0) entry.ticksLeft -= 1;
        if (entry.ticksLeft > 0) continue;
        // Done: spawn as soon as there is room (it waits while every spot is blocked).
        const at = spawnSpot(world, hq, entry.unitDefId);
        if (!at) continue;
        world.spawnUnit(entry.unitDefId, player.id, at, hq.heading, false);
        player.queue.shift();
    }
}

/** The first free spot next to the HQ for a unit of this type, or undefined if all are blocked. */
function spawnSpot(world: SimWorld, hq: SimUnit, defId: string): Vec | undefined {
    const stats = world.unitStatsOf(defId);
    // Clear of the HQ's real footprint: new units face the HQ's way, so ends and sides differ.
    const distances = {
        end: idiv(hq.stats.length + stats.length, 2) + SPAWN_GAP,
        side: idiv(hq.stats.width + stats.length, 2) + SPAWN_GAP,
        corner: idiv(hq.stats.length + stats.length, 2) + idiv(hq.stats.width, 2) + SPAWN_GAP,
    };
    const needed = clearanceFor(idiv(stats.width + 1, 2));
    for (const spot of SPAWN_SPOTS) {
        const at = vadd(hq.position, fromAngle(wrapAngle(hq.heading + spot.angle), distances[spot.side]));
        if (!world.grid.isPassable(cellOf(at), needed)) continue;
        let blocked = false;
        for (const u of world.units.values()) {
            if (length(vsub(u.position, at)) < u.stats.radius + stats.radius) {
                blocked = true;
                break;
            }
        }
        if (!blocked) return at;
    }
    return undefined;
}
