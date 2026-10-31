import { describe, expect, it } from 'vitest';
import { speedPerTickFx } from '../../src/data/convert';
import { loadGameData } from '../../src/data/content';
import { SimGrid, cellCenter } from '../../src/sim/grid';
import { SimWorld } from '../../src/sim/world';

/** The six HLD upgrades, on the real game data. Research takes 60 s. */
const data = loadGameData();
const SECOND = 20;

/** Player 0 is the League, player 1 the Raiders; both have their HQ and plenty of resources. */
function world(): SimWorld {
    const w = new SimWorld(new SimGrid(60, 60), 1, data);
    w.addPlayer(0, 'league', 0);
    w.addPlayer(1, 'raiders', 0);
    w.spawnUnit('league_dreadnought', 0, cellCenter({ x: 10, y: 10 }));
    w.spawnUnit('raiders_ravager', 1, cellCenter({ x: 50, y: 50 }));
    for (const p of w.players.values()) Object.assign(p.resources, { manpower: 10_000, oil: 1000, metal: 1000 });
    return w;
}

function run(w: SimWorld, ticks: number): void {
    for (let i = 0; i < ticks; i++) w.step();
}

function researched(w: SimWorld, playerId: number, upgradeId: string): void {
    w.schedule({ type: 'research', playerId, upgradeId });
    run(w, 60 * SECOND + 1);
    expect(w.players.get(playerId)!.researched).toContain(upgradeId);
}

describe('research', () => {
    it('pays at the start, takes 60 seconds, one research at a time', () => {
        const w = world();
        const league = w.players.get(0)!;
        w.schedule({ type: 'research', playerId: 0, upgradeId: 'league_brace' });
        w.schedule({ type: 'research', playerId: 0, upgradeId: 'league_knightly_vows' });
        run(w, 1);
        expect(league.research?.upgradeId).toBe('league_brace');
        expect(league.resources.oil).toBe(990);
        expect(league.resources.metal).toBe(950);
        run(w, 59 * SECOND);
        expect(league.researched).toEqual([]);
        run(w, 1 * SECOND);
        expect(league.researched).toEqual(['league_brace']);
    });

    it('refuses other factions’ upgrades, repeats and unaffordable research', () => {
        const w = world();
        const league = w.players.get(0)!;
        w.schedule({ type: 'research', playerId: 0, upgradeId: 'raiders_faster_faster' });
        run(w, 1);
        expect(league.research).toBeNull();
        researched(w, 0, 'league_brace');
        w.schedule({ type: 'research', playerId: 0, upgradeId: 'league_brace' });
        run(w, 1);
        expect(league.research).toBeNull();
        league.resources.metal = 0;
        w.schedule({ type: 'research', playerId: 0, upgradeId: 'league_knightly_vows' });
        run(w, 1);
        expect(league.research).toBeNull();
    });
});

describe('automatic upgrades', () => {
    it('Brace: +10 armour on all sides for every League vehicle, now and later', () => {
        const w = world();
        const knight = w.spawnUnit('league_knight', 0, cellCenter({ x: 20, y: 20 }));
        researched(w, 0, 'league_brace');
        expect(knight.stats.armour).toEqual({ front: 60, side: 50, rear: 50 });
        expect(w.hqOf(0)!.stats.armour).toEqual({ front: 90, side: 70, rear: 70 });
        const later = w.spawnUnit('league_steward', 0, cellCenter({ x: 25, y: 20 }));
        expect(later.stats.armour).toEqual({ front: 30, side: 30, rear: 20 });
        // The other player's units are untouched.
        const raider = w.spawnUnit('raiders_raider', 1, cellCenter({ x: 40, y: 40 }));
        expect(raider.stats.armour).toEqual({ front: 30, side: 30, rear: 20 });
    });

    it('Faster, Faster!: +10 top speed and +0.5 acceleration for every Raiders vehicle', () => {
        const w = world();
        const hunter = w.spawnUnit('raiders_hunter', 1, cellCenter({ x: 40, y: 40 }));
        researched(w, 1, 'raiders_faster_faster');
        expect(hunter.stats.topSpeedFx).toBe(speedPerTickFx(55));
        const base = w.unitStatsOf('raiders_hunter');
        expect(hunter.stats.accelerationFx).toBeGreaterThan(base.accelerationFx);
    });

    it('Combat Raider: +10 armour for Raiders only', () => {
        const w = world();
        const raider = w.spawnUnit('raiders_raider', 1, cellCenter({ x: 40, y: 40 }));
        const hunter = w.spawnUnit('raiders_hunter', 1, cellCenter({ x: 42, y: 40 }));
        researched(w, 1, 'raiders_combat_raider');
        expect(raider.stats.armour).toEqual({ front: 40, side: 40, rear: 30 });
        expect(hunter.stats.armour).toEqual({ front: 10, side: 10, rear: 10 });
    });

    it('Tactical gatherer: the Gatherer’s autocannon becomes a twin autocannon', () => {
        const w = world();
        const gatherer = w.spawnUnit('raiders_gatherer', 1, cellCenter({ x: 40, y: 40 }));
        researched(w, 1, 'raiders_tactical_gatherer');
        expect(gatherer.weapons.map((s) => [s.weapon.id, s.mount.id])).toEqual([['twin_autocannon', 'turret']]);
    });
});

describe('per-unit upgrades', () => {
    it('Knightly Vows: researched once, then applied to chosen Knights only', () => {
        const w = world();
        const a = w.spawnUnit('league_knight', 0, cellCenter({ x: 20, y: 20 }));
        const b = w.spawnUnit('league_knight', 0, cellCenter({ x: 24, y: 20 }));
        researched(w, 0, 'league_knightly_vows');
        expect(a.weapons[0].weapon.id).toBe('peacemaker');
        w.schedule({ type: 'applyUpgrade', playerId: 0, upgradeId: 'league_knightly_vows', unitIds: [a.id] });
        run(w, 1);
        expect(a.weapons[0].weapon.id).toBe('pacifier');
        expect(b.weapons[0].weapon.id).toBe('peacemaker');
    });

    it('Aggressive recon: adds an autocannon and costs 25 manpower per Sentinel', () => {
        const w = world();
        const league = w.players.get(0)!;
        const s1 = w.spawnUnit('league_sentinel', 0, cellCenter({ x: 20, y: 20 }));
        const s2 = w.spawnUnit('league_sentinel', 0, cellCenter({ x: 22, y: 20 }));
        expect(s1.weapons).toEqual([]);
        researched(w, 0, 'league_aggressive_recon');
        league.resources.manpower = 60;
        w.schedule({ type: 'applyUpgrade', playerId: 0, upgradeId: 'league_aggressive_recon', unitIds: [s1.id, s2.id] });
        run(w, 1);
        expect(s1.weapons.map((s) => s.weapon.id)).toEqual(['autocannon']);
        expect(s2.weapons.map((s) => s.weapon.id)).toEqual(['autocannon']);
        // 25 × 2 paid; the tick's base income (0.5 plus any carried fraction) may add 1.
        expect(league.resources.manpower - 10).toBeGreaterThanOrEqual(0);
        expect(league.resources.manpower - 10).toBeLessThanOrEqual(1);
    });

    it('cannot be applied before research, twice, or to the wrong unit type', () => {
        const w = world();
        const knight = w.spawnUnit('league_knight', 0, cellCenter({ x: 20, y: 20 }));
        const sentinel = w.spawnUnit('league_sentinel', 0, cellCenter({ x: 22, y: 20 }));
        w.schedule({ type: 'applyUpgrade', playerId: 0, upgradeId: 'league_knightly_vows', unitIds: [knight.id] });
        run(w, 1);
        expect(knight.upgrades).toEqual([]);
        researched(w, 0, 'league_knightly_vows');
        w.schedule({ type: 'applyUpgrade', playerId: 0, upgradeId: 'league_knightly_vows', unitIds: [knight.id, sentinel.id] });
        w.schedule({ type: 'applyUpgrade', playerId: 0, upgradeId: 'league_knightly_vows', unitIds: [knight.id] });
        run(w, 1);
        expect(knight.upgrades).toEqual(['league_knightly_vows']);
        expect(sentinel.upgrades).toEqual([]);
    });
});
