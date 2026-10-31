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
const [hq0, hq1] = [0, 1].map((p) => createWorld(config, data).hqOf(p)!.id);

/** A scripted match: both HQs get several orders at different ticks. */
const script: Command[] = [
    { type: 'move', playerId: 0, unitIds: [hq0], target: cellCenter({ x: 60, y: 100 }), tick: 5 },
    { type: 'move', playerId: 1, unitIds: [hq1], target: cellCenter({ x: 200, y: 150 }), tick: 5 },
    { type: 'move', playerId: 0, unitIds: [hq0, hq1], target: cellCenter({ x: 90, y: 180 }), tick: 300 },
    { type: 'stop', playerId: 1, unitIds: [hq1], tick: 400 },
    { type: 'move', playerId: 1, unitIds: [hq1], target: cellCenter({ x: 170, y: 90 }), tick: 450 },
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
        expect(world.players.get(1)!.incomeBonusPercent).toBe(25);
    });
});
