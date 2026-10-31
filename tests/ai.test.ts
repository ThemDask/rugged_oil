import { describe, expect, it } from 'vitest';
import { AiController } from '../src/ai/AiController';
import { loadGameData } from '../src/data/content';
import { createSkirmish } from '../src/setup/matchConfig';
import { createWorld } from '../src/sim/setup';
import type { SimWorld } from '../src/sim/world';

/**
 * The AI on the real game data and test map: AI against AI, both the League and the Raiders.
 * Checks that it plays the whole loop (extract, capture, recruit, research, fight), that it
 * never changes sim state while thinking, and that it is deterministic.
 */
const data = loadGameData();
const SECOND = 20;

function aiMatch(seed: number): { world: SimWorld; ais: AiController[] } {
    const config = createSkirmish('test_map', 'league', 'raiders', seed, 0);
    config.players[0].controller = 'ai';
    const world = createWorld(config, data);
    return { world, ais: config.players.map((_, id) => new AiController(id, world)) };
}

function play(world: SimWorld, ais: AiController[], ticks: number, each?: () => void): void {
    for (let i = 0; i < ticks; i++) {
        for (const ai of ais) for (const command of ai.think(world)) world.schedule(command);
        world.step();
        each?.();
    }
}

describe('AI', () => {
    it('plays the whole loop against another AI', () => {
        const { world, ais } = aiMatch(11);
        const seen = { extractors: [0, 0], points: [0, 0], research: [0, 0], damage: false };
        play(world, ais, 12 * 60 * SECOND, () => {
            for (const p of [0, 1]) {
                const units = [...world.units.values()].filter((u) => u.playerId === p);
                seen.extractors[p] = Math.max(seen.extractors[p], units.filter((u) => u.stats.extraction).length);
                seen.points[p] = Math.max(seen.points[p], [...world.reqPoints.values()].filter((pt) => pt.owner === p).length);
                seen.research[p] = Math.max(seen.research[p], world.players.get(p)!.researched.length);
            }
            if ([...world.units.values()].some((u) => u.health < u.stats.health)) seen.damage = true;
        });
        expect(seen.extractors).toEqual([data.ai.extractors, data.ai.extractors]);
        expect(Math.min(...seen.points)).toBeGreaterThan(0);
        expect(Math.min(...seen.research)).toBeGreaterThan(0);
        expect(seen.damage).toBe(true);
    });

    it('never changes sim state while thinking', () => {
        const { world, ais } = aiMatch(5);
        play(world, ais, 3 * 60 * SECOND, () => {
            const before = world.checksum();
            for (const ai of ais) ai.think(world);
            expect(world.checksum()).toBe(before);
        });
    });

    it('is deterministic: two AI matches with the same seed agree on every tick', () => {
        const run = () => {
            const { world, ais } = aiMatch(99);
            const sums: number[] = [];
            play(world, ais, 4 * 60 * SECOND, () => sums.push(world.checksum()));
            return sums;
        };
        expect(run()).toEqual(run());
    });
});
