import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data/content';
import { createSkirmish } from '../src/setup/matchConfig';
import type { Command } from '../src/sim/commands';
import { cellCenter } from '../src/sim/grid';
import { createWorld } from '../src/sim/setup';

/**
 * The lockstep guarantee: the same config and the same commands produce the same state at every
 * tick. Any change that breaks this would cause multiplayer desyncs.
 */
const data = loadGameData();
const config = createSkirmish('test_map', 'league', 'raiders', 12345, data.rules.aiIncomeBonusPercent);
const start = createWorld(config, data);
const [hq0, hq1] = [0, 1].map((p) => start.hqOf(p)!.id);
const [point0] = [...start.reqPoints.keys()];
const [reserve0] = [...start.reserves.keys()];

/** A scripted match: both HQs get several orders at different ticks. */
const script: Command[] = [
    { type: 'move', playerId: 0, unitIds: [hq0], target: cellCenter({ x: 60, y: 100 }), tick: 5 },
    { type: 'move', playerId: 1, unitIds: [hq1], target: cellCenter({ x: 200, y: 150 }), tick: 5 },
    { type: 'move', playerId: 0, unitIds: [hq0, hq1], target: cellCenter({ x: 90, y: 180 }), tick: 300 },
    { type: 'stop', playerId: 1, unitIds: [hq1], tick: 400 },
    { type: 'move', playerId: 1, unitIds: [hq1], target: cellCenter({ x: 170, y: 90 }), tick: 450 },
    // Economy: both recruit extractors and units, one cancels, HQ 0 queues a capture.
    { type: 'recruit', playerId: 0, unitDefId: 'league_lifeline', tick: 2 },
    { type: 'recruit', playerId: 1, unitDefId: 'raiders_gatherer', tick: 2 },
    { type: 'recruit', playerId: 1, unitDefId: 'raiders_spotter', tick: 3 },
    { type: 'cancelRecruit', playerId: 1, index: 1, tick: 4 },
    { type: 'research', playerId: 1, upgradeId: 'raiders_tactical_gatherer', tick: 6 },
    { type: 'capture', playerId: 0, unitIds: [hq0], pointId: point0, queue: true, tick: 600 },
    // The Lifeline is the second unit spawned in the match (the Raiders' Gatherer finishes first).
    { type: 'gather', playerId: 0, unitIds: [hq1 + 2], reserveId: reserve0, tick: 700 },
];

function play(ticks: number): number[] {
    const world = createWorld(config, data);
    for (const command of script) world.schedule(structuredClone(command));
    const checksums: number[] = [];
    for (let i = 0; i < ticks; i++) {
        world.step();
        checksums.push(world.checksum());
    }
    return checksums;
}

describe('determinism', () => {
    it('two runs with the same commands agree on every tick', () => {
        const a = play(1200);
        const b = play(1200);
        expect(a).toEqual(b);
    });

    it('a battle between both factions plays out identically twice', () => {
        const battle = (): number[] => {
            const world = createWorld(config, data);
            const at = (x: number, y: number) => cellCenter({ x, y });
            for (const [i, id] of data.faction('league')!.units.entries()) world.spawnUnit(id, 0, at(100, 120 + i * 3));
            for (const [i, id] of data.faction('raiders')!.units.entries()) world.spawnUnit(id, 1, at(118, 120 + i * 3), 2048);
            const ids = (p: number) => [...world.units.values()].filter((u) => u.playerId === p && !u.isHq).map((u) => u.id);
            world.schedule({ type: 'attackMove', playerId: 0, unitIds: ids(0), target: at(125, 126) });
            world.schedule({ type: 'attackMove', playerId: 1, unitIds: ids(1), target: at(95, 126) });
            const sums: number[] = [];
            for (let i = 0; i < 900; i++) {
                world.step();
                sums.push(world.checksum());
            }
            expect([...world.units.values()].some((u) => u.health < u.stats.health) || world.units.size < 12).toBe(true);
            return sums;
        };
        expect(battle()).toEqual(battle());
    });

    it('the scripted economy happens: recruits spawn and the Lifeline gathers', () => {
        const world = createWorld(config, data);
        for (const command of script) world.schedule(structuredClone(command));
        for (let i = 0; i < 1200; i++) world.step();
        const lifeline = world.units.get(hq1 + 2)!;
        expect(lifeline.defId).toBe('league_lifeline');
        expect(lifeline.orders[0]?.type).toBe('gather');
        expect(world.players.get(1)!.queue).toEqual([]);
    });

    it('a different command changes the outcome', () => {
        const world = createWorld(config, data);
        const before = world.checksum();
        world.schedule({ type: 'move', playerId: 0, unitIds: [hq0], target: cellCenter({ x: 40, y: 100 }) });
        for (let i = 0; i < 20; i++) world.step();
        const moved = world.checksum();
        const idle = createWorld(config, data);
        for (let i = 0; i < 20; i++) idle.step();
        expect(moved).not.toBe(idle.checksum());
        expect(before).not.toBe(moved);
    });

    it('starts each player with their HQ on their spawn, the map objects and starting resources', () => {
        const world = createWorld(config, data);
        const hqs = [...world.units.values()].filter((u) => u.isHq);
        expect(hqs.map((u) => [u.playerId, u.defId])).toEqual([[0, 'league_dreadnought'], [1, 'raiders_ravager']]);
        expect(hqs[0].position).toEqual(cellCenter(data.map('test_map')!.spawns[0]));
        expect(world.reqPoints.size).toBe(8);
        expect(world.reserves.size).toBe(8);
        expect(world.players.get(0)!.resources).toEqual({ manpower: 500, oil: 0, metal: 0 });
        expect(world.players.get(1)!.incomeBonusPercent).toBe(data.rules.aiIncomeBonusPercent);
    });
});
