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
const faction = data.factions()[0].id;
const config = createSkirmish('test_map', faction, faction, 12345);

/** A scripted match: both base vehicles get several orders at different ticks. */
const script: Command[] = [
    { type: 'move', playerId: 0, unitIds: [1], target: cellCenter({ x: 24, y: 30 }), tick: 5 },
    { type: 'move', playerId: 1, unitIds: [2], target: cellCenter({ x: 40, y: 12 }), tick: 5 },
    { type: 'move', playerId: 0, unitIds: [1, 2], target: cellCenter({ x: 50, y: 30 }), tick: 300 },
    { type: 'move', playerId: 1, unitIds: [2], target: cellCenter({ x: 20, y: 20 }), tick: 450 },
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
        world.schedule({ type: 'move', playerId: 0, unitIds: [1], target: cellCenter({ x: 10, y: 10 }) });
        for (let i = 0; i < 20; i++) world.step();
        const moved = world.checksum();
        const idle = createWorld(config, data);
        for (let i = 0; i < 20; i++) idle.step();
        expect(moved).not.toBe(idle.checksum());
        expect(before).not.toBe(moved);
    });

    it('starts each player with exactly one base vehicle on their spawn', () => {
        const world = createWorld(config, data);
        const bases = [...world.units.values()].filter((u) => u.isBase);
        expect(bases.map((u) => u.playerId)).toEqual([0, 1]);
        expect(bases[0].position).toEqual(cellCenter(data.map('test_map')!.spawns[0]));
    });
});
