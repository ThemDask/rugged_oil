import { describe, expect, it } from 'vitest';
import { SimGrid, cellCenter } from '../../src/sim/grid';
import { SimWorld } from '../../src/sim/world';
import { faction, gameData, hq, map, mount, rules, unit, upgrade, weapon } from '../fixtures';

/** Fixture content with two extractors: a hauler (League style) and an on-the-spot gatherer (Raiders style). */
const data = gameData([
    rules(),
    faction({ units: ['t_tank', 't_hauler', 't_digger', 't_heavy'] }),
    hq(),
    unit(),
    unit({ id: 't_heavy', sizeClass: 'heavy', cost: { manpower: 700 } }),
    unit({ id: 't_hauler', role: 'Extractor', topSpeed: 20, cost: { manpower: 250 }, recruitTime: 2, extraction: { mode: 'haul', ratePerMinute: { oil: 600, metal: 600 }, maxLoad: { oil: 10, metal: 15 } } }),
    unit({ id: 't_digger', role: 'Extractor', cost: { manpower: 250 }, extraction: { mode: 'onSpot', ratePerMinute: { oil: 600, metal: 600 } } }),
    weapon(),
    mount(),
    upgrade(),
    map(),
]);

const SECOND = 20;

/** 40x40 open grid, two players (player 1 with `bonus` percent income), no starting units. */
function world(bonus = 0): SimWorld {
    const w = new SimWorld(new SimGrid(40, 40), 7, data);
    w.addPlayer(0, 't', 0);
    w.addPlayer(1, 't', bonus);
    return w;
}

function run(w: SimWorld, ticks: number): void {
    for (let i = 0; i < ticks; i++) w.step();
}

const player = (w: SimWorld, id = 0) => w.players.get(id)!;

describe('income', () => {
    it('pays the base manpower income per second', () => {
        const w = world();
        run(w, 10 * SECOND);
        expect(player(w).resources.manpower).toBe(500 + 10 * 10);
    });

    it('adds income for each held requisition point', () => {
        const w = world();
        w.addReqPoint(cellCenter({ x: 5, y: 5 })).owner = 0;
        w.addReqPoint(cellCenter({ x: 9, y: 5 })).owner = 0;
        run(w, 10 * SECOND);
        expect(player(w).resources.manpower).toBe(500 + 10 * (10 + 2 * 10));
    });

    it('gives the AI its percent bonus exactly, including fractions', () => {
        const w = world(25);
        run(w, 10 * SECOND);
        // 10/s × 1.25 = 12.5/s.
        expect(player(w, 1).resources.manpower).toBe(500 + 125);
    });
});

describe('requisition capture', () => {
    function capturer(w: SimWorld, defId: string, playerId: number, tile: { x: number; y: number }, pointId: number) {
        const u = w.spawnUnit(defId, playerId, cellCenter(tile));
        w.schedule({ type: 'capture', playerId, unitIds: [u.id], pointId });
        return u;
    }

    it('takes 30 s / (1 + 1/9) = 27 s for weight 2, then counts as held', () => {
        const w = world();
        const point = w.addReqPoint(cellCenter({ x: 20, y: 20 }));
        capturer(w, 't_hauler', 0, { x: 20, y: 20 }, point.id); // medium: weight 2
        run(w, 1);
        // Weight 2: speed 1 + 1/9 → 30 s / (10/9) = 27 s.
        run(w, 26 * SECOND);
        expect(point.owner).toBe(-1);
        run(w, 1 * SECOND + 2);
        expect(point.owner).toBe(0);
    });

    it('captures faster with more weight, by the 1 + (w − 1) / 9 rule', () => {
        const w = world();
        const point = w.addReqPoint(cellCenter({ x: 20, y: 20 }));
        capturer(w, 't_heavy', 0, { x: 20, y: 20 }, point.id); // weight 5: ×13/9 → about 20.8 s
        run(w, 20 * SECOND);
        expect(point.owner).toBe(-1);
        run(w, 1 * SECOND + 2);
        expect(point.owner).toBe(0);
    });

    it('neutralises an enemy point before capturing it', () => {
        const w = world();
        const point = w.addReqPoint(cellCenter({ x: 20, y: 20 }));
        point.owner = 1;
        capturer(w, 't_heavy', 0, { x: 20, y: 20 }, point.id);
        run(w, 22 * SECOND);
        expect(point.owner).toBe(-1);
        run(w, 22 * SECOND);
        expect(point.owner).toBe(0);
    });

    it('pauses while both sides have equal weight', () => {
        const w = world();
        const point = w.addReqPoint(cellCenter({ x: 20, y: 20 }));
        const a = capturer(w, 't_tank', 0, { x: 19, y: 20 }, point.id);
        const b = capturer(w, 't_tank', 1, { x: 21, y: 20 }, point.id);
        // Hold fire, so the two tanks don't destroy each other during the test.
        w.schedule({ type: 'holdFire', playerId: 0, unitIds: [a.id], holdFire: true });
        w.schedule({ type: 'holdFire', playerId: 1, unitIds: [b.id], holdFire: true });
        run(w, 40 * SECOND);
        expect(point.owner).toBe(-1);
        expect(point.progress).toBe(0);
    });

    it('lets the heavier side capture at the speed of the difference', () => {
        const w = world();
        const point = w.addReqPoint(cellCenter({ x: 20, y: 20 }));
        const a = capturer(w, 't_heavy', 0, { x: 19, y: 20 }, point.id); // 5
        const b = capturer(w, 't_tank', 1, { x: 21, y: 20 }, point.id); // 2 → difference 3: ×11/9 ≈ 24.5 s
        w.schedule({ type: 'holdFire', playerId: 0, unitIds: [a.id], holdFire: true });
        w.schedule({ type: 'holdFire', playerId: 1, unitIds: [b.id], holdFire: true });
        run(w, 24 * SECOND);
        expect(point.owner).toBe(-1);
        run(w, 1 * SECOND + 2);
        expect(point.owner).toBe(0);
    });

    it('only counts units with a capture order', () => {
        const w = world();
        const point = w.addReqPoint(cellCenter({ x: 20, y: 20 }));
        w.spawnUnit('t_heavy', 0, cellCenter({ x: 20, y: 20 }));
        run(w, 40 * SECOND);
        expect(point.owner).toBe(-1);
    });

    it('decays slowly for 10 seconds after the capturers leave, then drops to zero', () => {
        const w = world();
        const point = w.addReqPoint(cellCenter({ x: 20, y: 20 }));
        const u = capturer(w, 't_heavy', 0, { x: 20, y: 20 }, point.id);
        run(w, 10 * SECOND);
        w.schedule({ type: 'stop', playerId: 0, unitIds: [u.id] });
        run(w, 2);
        const before = point.progress;
        run(w, 5 * SECOND);
        expect(point.progress).toBeGreaterThan(0);
        expect(point.progress).toBeLessThan(before);
        run(w, 6 * SECOND);
        expect(point.progress).toBe(0);
    });

    it('ends the capture order once the point is held, so queued orders continue', () => {
        const w = world();
        const point = w.addReqPoint(cellCenter({ x: 20, y: 20 }));
        const u = capturer(w, 't_heavy', 0, { x: 20, y: 20 }, point.id);
        w.schedule({ type: 'move', playerId: 0, unitIds: [u.id], target: cellCenter({ x: 30, y: 20 }), queue: true });
        run(w, 40 * SECOND);
        expect(point.owner).toBe(0);
        expect(u.position).toEqual(cellCenter({ x: 30, y: 20 }));
    });

    it('drives units into the capture square first', () => {
        const w = world();
        const point = w.addReqPoint(cellCenter({ x: 30, y: 30 }));
        capturer(w, 't_tank', 0, { x: 5, y: 5 }, point.id);
        run(w, 60 * SECOND);
        expect(point.owner).toBe(0);
        expect(point.progress).toBe(0);
    });
});

describe('extraction', () => {
    it('gathers on the spot into the player stock and empties the reserve', () => {
        const w = world();
        const reserve = w.addReserve(cellCenter({ x: 20, y: 20 }), 'oil', 100);
        const digger = w.spawnUnit('t_digger', 0, cellCenter({ x: 20, y: 22 }));
        w.schedule({ type: 'gather', playerId: 0, unitIds: [digger.id], reserveId: reserve.id });
        run(w, 6 * SECOND); // 600 per minute = 10 per second
        expect(player(w).resources.oil).toBeGreaterThanOrEqual(50);
        run(w, 10 * SECOND);
        expect(reserve.amountLeft).toBe(0);
        expect(player(w).resources.oil).toBe(100);
        expect(digger.orders).toEqual([]); // stays in place once the reserve is empty
    });

    it('hauls full loads to the HQ and comes back', () => {
        const w = world();
        w.spawnUnit('t_hq', 0, cellCenter({ x: 5, y: 20 }));
        const reserve = w.addReserve(cellCenter({ x: 30, y: 20 }), 'metal', 150);
        const hauler = w.spawnUnit('t_hauler', 0, cellCenter({ x: 28, y: 22 }));
        w.schedule({ type: 'gather', playerId: 0, unitIds: [hauler.id], reserveId: reserve.id });
        let maxLoad = 0;
        for (let i = 0; i < 40 * SECOND; i++) {
            w.step();
            maxLoad = Math.max(maxLoad, hauler.load.metal ?? 0);
        }
        expect(maxLoad).toBe(15);
        expect(player(w).resources.metal).toBeGreaterThanOrEqual(15);
        expect(player(w).resources.metal % 15).toBe(0);
    });

    it('loses a hauler load if the hauler dies on the way', () => {
        const w = world();
        w.spawnUnit('t_hq', 0, cellCenter({ x: 5, y: 20 }));
        const reserve = w.addReserve(cellCenter({ x: 30, y: 20 }), 'oil', 100);
        const hauler = w.spawnUnit('t_hauler', 0, cellCenter({ x: 30, y: 21 }));
        w.schedule({ type: 'gather', playerId: 0, unitIds: [hauler.id], reserveId: reserve.id });
        run(w, 3 * SECOND);
        expect(hauler.load.oil).toBe(10);
        hauler.dead = true;
        run(w, 1);
        expect(player(w).resources.oil).toBe(0);
    });

    it('ignores gather orders for units that are not extractors', () => {
        const w = world();
        const reserve = w.addReserve(cellCenter({ x: 20, y: 20 }), 'oil', 100);
        const tank = w.spawnUnit('t_tank', 0, cellCenter({ x: 20, y: 22 }));
        w.schedule({ type: 'gather', playerId: 0, unitIds: [tank.id], reserveId: reserve.id });
        run(w, 2);
        expect(tank.orders).toEqual([]);
    });
});

describe('production', () => {
    function withHq(): SimWorld {
        const w = world();
        w.spawnUnit('t_hq', 0, cellCenter({ x: 20, y: 20 }));
        return w;
    }

    it('pays at once, recruits after the timer and spawns next to the HQ', () => {
        const w = withHq();
        w.schedule({ type: 'recruit', playerId: 0, unitDefId: 't_hauler' });
        run(w, 1);
        expect(player(w).resources.manpower).toBe(250);
        expect(player(w).population).toBe(2);
        run(w, 2 * SECOND);
        const spawned = [...w.units.values()].filter((u) => u.defId === 't_hauler');
        expect(spawned).toHaveLength(1);
        expect(player(w).queue).toEqual([]);
        expect(player(w).population).toBe(2);
    });

    it('recruits queued units one at a time', () => {
        const w = withHq();
        w.schedule({ type: 'recruit', playerId: 0, unitDefId: 't_hauler' });
        w.schedule({ type: 'recruit', playerId: 0, unitDefId: 't_hauler' });
        run(w, 2 * SECOND + 1);
        expect([...w.units.values()].filter((u) => u.defId === 't_hauler')).toHaveLength(1);
        run(w, 2 * SECOND);
        expect([...w.units.values()].filter((u) => u.defId === 't_hauler')).toHaveLength(2);
    });

    it('refunds a cancelled unit in full', () => {
        const w = withHq();
        w.schedule({ type: 'recruit', playerId: 0, unitDefId: 't_hauler' });
        run(w, 1);
        w.schedule({ type: 'cancelRecruit', playerId: 0, index: 0 });
        run(w, 1);
        expect(player(w).queue).toEqual([]);
        expect(player(w).population).toBe(0);
        // 500 back in full, plus 1 manpower of base income from the two ticks.
        expect(player(w).resources.manpower).toBe(501);
    });

    it('refuses what the player cannot afford, a full queue and units of other factions', () => {
        const w = withHq();
        Object.assign(player(w).resources, { manpower: 100_000, oil: 1000, metal: 1000 });
        for (let i = 0; i < 7; i++) w.schedule({ type: 'recruit', playerId: 0, unitDefId: 't_tank' });
        w.schedule({ type: 'recruit', playerId: 0, unitDefId: 'league_knight' });
        run(w, 1);
        expect(player(w).queue).toHaveLength(5);
        player(w).resources.oil = 0;
        player(w).queue = [];
        player(w).population = 0;
        w.schedule({ type: 'recruit', playerId: 0, unitDefId: 't_tank' }); // costs 20 oil
        run(w, 1);
        expect(player(w).queue).toEqual([]);
    });

    it('refuses units that would exceed the population cap', () => {
        const w = withHq();
        player(w).resources.manpower = 100_000;
        player(w).population = 96;
        w.schedule({ type: 'recruit', playerId: 0, unitDefId: 't_heavy' }); // 5 → 101
        w.schedule({ type: 'recruit', playerId: 0, unitDefId: 't_hauler' }); // 2 → 98
        run(w, 1);
        expect(player(w).queue.map((e) => e.unitDefId)).toEqual(['t_hauler']);
    });

    it('needs a living HQ', () => {
        const w = world();
        w.schedule({ type: 'recruit', playerId: 0, unitDefId: 't_hauler' });
        run(w, 1);
        expect(player(w).queue).toEqual([]);
    });
});
