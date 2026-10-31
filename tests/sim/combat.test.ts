import { describe, expect, it } from 'vitest';
import { SimGrid, cellCenter } from '../../src/sim/grid';
import { HALF_TURN, QUARTER_TURN } from '../../src/sim/math';
import { damageAfterArmour, facingArmour } from '../../src/sim/projectiles';
import { rebuildVisibility } from '../../src/sim/visibility';
import { SimWorld } from '../../src/sim/world';
import { faction, gameData, hq, map, mount, rules, unit, upgrade, weapon } from '../fixtures';

/**
 * Fixture tank: medium, armour 50/40/40, 1500 health, one turret gun (150 m range, 2 shots/s,
 * 50 damage, 5 piercing, 100 m/s, 200 m max distance), spotting 200 m, 25 m/s.
 * A front hit does 2 + (48 − 24) = 26 damage.
 */
const data = gameData([
    rules(),
    faction({ units: ['t_tank', 't_fixed', 't_scout'] }),
    hq(),
    unit(),
    unit({ id: 't_fixed', weapons: [{ weapon: 'gun', mount: 'armoured' }] }),
    unit({ id: 't_scout', sizeClass: 'light', weapons: [], spottingRange: 300 }),
    weapon(),
    mount(),
    mount({ id: 'armoured', arc: 30, rotationSpeed: 30 }),
    upgrade(),
    map(),
]);

const SECOND = 20;

/** 60 x 30 tiles (600 x 300 m), open, optional wall at x = 30 (rows 5-24), two players on two teams. */
function world(wall = false): SimWorld {
    const grid = new SimGrid(60, 30);
    if (wall) grid.blockRect({ x: 30, y: 5, w: 1, h: 20 });
    grid.updateClearance();
    const w = new SimWorld(grid, 3, data);
    w.addPlayer(0, 't', 0);
    w.addPlayer(1, 't', 0);
    return w;
}

function run(w: SimWorld, ticks: number): void {
    for (let i = 0; i < ticks; i++) w.step();
}

describe('damage', () => {
    it('lets the piercing share through and blocks the armour percentage of the rest', () => {
        // 500 damage, 50 piercing: 250 goes through; armour 60 blocks 150 of the other 250.
        expect(damageAfterArmour(500, 50, 60)).toBe(350);
        expect(damageAfterArmour(50, 5, 50)).toBe(26);
    });

    it('makes armour 100 immune to everything but piercing', () => {
        expect(damageAfterArmour(400, 0, 100)).toBe(0);
        expect(damageAfterArmour(400, 25, 100)).toBe(100);
    });

    it('uses front, side or rear armour depending on where the shot comes from', () => {
        const armour = { front: 80, side: 50, rear: 20 };
        // A target facing +x (heading 0). A shot travelling +x hits its rear; travelling −x, its front.
        expect(facingArmour(armour, 0, 0)).toBe(20);
        expect(facingArmour(armour, 0, HALF_TURN)).toBe(80);
        expect(facingArmour(armour, 0, QUARTER_TURN)).toBe(50);
    });
});

describe('visibility', () => {
    it('sees within spotting range, not beyond', () => {
        const w = world();
        w.spawnUnit('t_tank', 0, cellCenter({ x: 10, y: 15 }));
        rebuildVisibility(w);
        expect(w.isVisibleTo(0, cellCenter({ x: 29, y: 15 }))).toBe(true); // 190 m
        expect(w.isVisibleTo(0, cellCenter({ x: 32, y: 15 }))).toBe(false); // 220 m
        expect(w.isVisibleTo(1, cellCenter({ x: 12, y: 15 }))).toBe(false);
    });

    it('does not see behind obstacles', () => {
        const w = world(true);
        w.spawnUnit('t_tank', 0, cellCenter({ x: 25, y: 15 }));
        rebuildVisibility(w);
        expect(w.isVisibleTo(0, cellCenter({ x: 30, y: 15 }))).toBe(true); // the wall itself
        expect(w.isVisibleTo(0, cellCenter({ x: 34, y: 15 }))).toBe(false); // behind it
    });
});

describe('combat', () => {
    it('two enemy tanks in range shoot until one is destroyed and removed', () => {
        const w = world();
        const a = w.spawnUnit('t_tank', 0, cellCenter({ x: 20, y: 15 }));
        const b = w.spawnUnit('t_tank', 1, cellCenter({ x: 32, y: 15 }), HALF_TURN); // 120 m, facing each other
        run(w, 2 * SECOND);
        expect(a.health).toBeLessThan(1500);
        expect(b.health).toBeLessThan(1500);
        run(w, 60 * SECOND);
        expect(w.units.has(a.id) && w.units.has(b.id)).toBe(false);
    });

    it('does not shoot through obstacles', () => {
        const w = world(true);
        const a = w.spawnUnit('t_tank', 0, cellCenter({ x: 25, y: 15 }));
        const b = w.spawnUnit('t_tank', 1, cellCenter({ x: 35, y: 15 }));
        run(w, 10 * SECOND);
        expect(a.health).toBe(1500);
        expect(b.health).toBe(1500);
    });

    it('has no friendly fire: shots pass through allies', () => {
        const w = world();
        const shooter = w.spawnUnit('t_tank', 0, cellCenter({ x: 15, y: 15 }));
        const ally = w.spawnUnit('t_tank', 0, cellCenter({ x: 20, y: 15 }));
        const enemy = w.spawnUnit('t_scout', 1, cellCenter({ x: 28, y: 15 })); // unarmed
        run(w, 3 * SECOND);
        expect(ally.health).toBe(1500);
        expect(enemy.health).toBeLessThan(w.unitStatsOf('t_scout').health); // hit through the ally
        expect(shooter.health).toBe(1500);
    });

    it('holds fire when told to', () => {
        const w = world();
        const a = w.spawnUnit('t_tank', 0, cellCenter({ x: 20, y: 15 }));
        const b = w.spawnUnit('t_scout', 1, cellCenter({ x: 30, y: 15 }));
        w.schedule({ type: 'holdFire', playerId: 0, unitIds: [a.id], holdFire: true });
        run(w, 5 * SECOND);
        expect(b.health).toBe(w.unitStatsOf('t_scout').health);
    });

    it('never moves on its own, even when outranged', () => {
        const w = world();
        const a = w.spawnUnit('t_tank', 0, cellCenter({ x: 10, y: 15 }));
        w.spawnUnit('t_scout', 1, cellCenter({ x: 27, y: 15 })); // 170 m: visible, out of gun range
        const start = { ...a.position };
        run(w, 5 * SECOND);
        expect(a.position).toEqual(start);
    });

    it('a fixed-arc weapon only fires at targets in front', () => {
        const w = world();
        const fixed = w.spawnUnit('t_fixed', 0, cellCenter({ x: 20, y: 15 }), 0); // facing +x
        const behind = w.spawnUnit('t_scout', 1, cellCenter({ x: 10, y: 15 }));
        w.schedule({ type: 'holdFire', playerId: 1, unitIds: [behind.id], holdFire: true });
        run(w, 5 * SECOND);
        expect(behind.health).toBe(w.unitStatsOf('t_scout').health);
        expect(fixed.heading).toBe(0);
    });

    it('idle units turn toward a visible attacker', () => {
        const w = world();
        const fixed = w.spawnUnit('t_fixed', 0, cellCenter({ x: 20, y: 15 }), 0);
        w.spawnUnit('t_tank', 1, cellCenter({ x: 8, y: 15 })); // behind it, 120 m
        run(w, 20 * SECOND);
        // Turned around (toward −x) and fires back.
        expect(Math.abs(fixed.heading - HALF_TURN)).toBeLessThan(64);
    });

    it('attack order: drives into range, then destroys the target', () => {
        const w = world();
        const a = w.spawnUnit('t_tank', 0, cellCenter({ x: 5, y: 15 }));
        w.spawnUnit('t_scout', 0, cellCenter({ x: 28, y: 15 })); // spots for player 0
        const target = w.spawnUnit('t_scout', 1, cellCenter({ x: 40, y: 15 }));
        rebuildVisibility(w);
        w.schedule({ type: 'attack', playerId: 0, unitIds: [a.id], targetId: target.id });
        run(w, 60 * SECOND);
        expect(w.units.has(target.id)).toBe(false);
        expect(a.orders).toEqual([]);
    });

    it('attack-move stops to fight and continues afterwards', () => {
        const w = world();
        const a = w.spawnUnit('t_tank', 0, cellCenter({ x: 5, y: 15 }));
        const enemy = w.spawnUnit('t_scout', 1, cellCenter({ x: 30, y: 15 }));
        w.schedule({ type: 'holdFire', playerId: 1, unitIds: [enemy.id], holdFire: true });
        const goal = cellCenter({ x: 55, y: 15 });
        w.schedule({ type: 'attackMove', playerId: 0, unitIds: [a.id], target: goal });
        run(w, 90 * SECOND);
        expect(w.units.has(enemy.id)).toBe(false);
        expect(a.position).toEqual(goal);
    });

    it('hits a moving target by leading the shot', () => {
        const w = world();
        const shooter = w.spawnUnit('t_tank', 0, cellCenter({ x: 30, y: 2 }));
        const runner = w.spawnUnit('t_tank', 1, cellCenter({ x: 20, y: 12 }));
        w.schedule({ type: 'holdFire', playerId: 1, unitIds: [runner.id], holdFire: true });
        w.schedule({ type: 'move', playerId: 1, unitIds: [runner.id], target: cellCenter({ x: 45, y: 12 }) });
        run(w, 8 * SECOND);
        expect(runner.health).toBeLessThan(1500);
        expect(shooter.health).toBe(1500);
    });

    it('destroying the HQ ends the match', () => {
        const w = world();
        w.spawnUnit('t_hq', 0, cellCenter({ x: 5, y: 15 }));
        const enemyHq = w.spawnUnit('t_hq', 1, cellCenter({ x: 55, y: 15 }));
        enemyHq.health = 1;
        w.spawnUnit('t_tank', 0, cellCenter({ x: 45, y: 15 }));
        run(w, 5 * SECOND);
        expect(w.winner).toBe(0);
    });
});
