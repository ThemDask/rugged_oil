import { describe, expect, it } from 'vitest';
import { SimGrid, cellCenter, cellOf } from '../../src/sim/grid';
import { length, vsub } from '../../src/sim/math';
import { SimWorld } from '../../src/sim/world';
import { gameData } from '../fixtures';

const data = gameData();

/** 24x14 grid with a wall at x=12 from the top down to y=9, and two players. */
function world(): SimWorld {
    const grid = new SimGrid(24, 14);
    grid.blockRect({ x: 12, y: 0, w: 1, h: 10 });
    grid.updateClearance();
    const w = new SimWorld(grid, 42, data);
    w.addPlayer(0, 't', 0);
    w.addPlayer(1, 't', 0);
    return w;
}

function run(w: SimWorld, ticks: number, each?: () => void): void {
    for (let i = 0; i < ticks; i++) {
        w.step();
        each?.();
    }
}

describe('SimWorld', () => {
    it('applies a move on the next tick and drives around the wall', () => {
        const w = world();
        const tank = w.spawnUnit('t_tank', 0, cellCenter({ x: 3, y: 3 }));
        const target = cellCenter({ x: 20, y: 3 });
        w.schedule({ type: 'move', playerId: 0, unitIds: [tank.id], target });
        let enteredWall = false;
        run(w, 600, () => {
            if (w.grid.isBlocked(cellOf(tank.position))) enteredWall = true;
        });
        expect(enteredWall).toBe(false);
        expect(tank.position).toEqual(target);
        expect(tank.speedFx).toBe(0);
        expect(tank.orders).toEqual([]);
    });

    it('only moves units owned by the issuing player', () => {
        const w = world();
        const mine = w.spawnUnit('t_tank', 0, cellCenter({ x: 3, y: 3 }));
        const theirs = w.spawnUnit('t_tank', 1, cellCenter({ x: 3, y: 6 }));
        w.schedule({ type: 'move', playerId: 0, unitIds: [mine.id, theirs.id], target: cellCenter({ x: 6, y: 12 }) });
        w.step();
        expect(mine.waypoints.length).toBeGreaterThan(0);
        expect(theirs.waypoints).toEqual([]);
    });

    it('spreads a group over separate targets', () => {
        const w = world();
        const a = w.spawnUnit('t_tank', 0, cellCenter({ x: 3, y: 3 }));
        const b = w.spawnUnit('t_tank', 0, cellCenter({ x: 3, y: 5 }));
        w.schedule({ type: 'move', playerId: 0, unitIds: [a.id, b.id], target: cellCenter({ x: 6, y: 12 }) });
        w.step();
        expect(a.waypoints.at(-1)).not.toEqual(b.waypoints.at(-1));
    });

    it('drives through Shift-queued orders one after another', () => {
        const w = world();
        const tank = w.spawnUnit('t_tank', 0, cellCenter({ x: 3, y: 3 }));
        const first = cellCenter({ x: 6, y: 12 });
        const second = cellCenter({ x: 20, y: 12 });
        w.schedule({ type: 'move', playerId: 0, unitIds: [tank.id], target: first });
        w.schedule({ type: 'move', playerId: 0, unitIds: [tank.id], target: second, queue: true });
        w.step();
        expect(tank.orders.map((o) => o.type)).toEqual(['move', 'move']);
        let passedFirst = false;
        run(w, 800, () => {
            if (tank.position.x === first.x && tank.position.y === first.y) passedFirst = true;
        });
        expect(passedFirst).toBe(true);
        expect(tank.position).toEqual(second);
        expect(tank.orders).toEqual([]);
    });

    it('a new order without Shift replaces the queue', () => {
        const w = world();
        const tank = w.spawnUnit('t_tank', 0, cellCenter({ x: 3, y: 3 }));
        w.schedule({ type: 'move', playerId: 0, unitIds: [tank.id], target: cellCenter({ x: 6, y: 12 }) });
        w.schedule({ type: 'move', playerId: 0, unitIds: [tank.id], target: cellCenter({ x: 20, y: 12 }), queue: true });
        w.schedule({ type: 'attackMove', playerId: 0, unitIds: [tank.id], target: cellCenter({ x: 8, y: 3 }) });
        w.step();
        expect(tank.orders).toEqual([{ type: 'attackMove', target: cellCenter({ x: 8, y: 3 }) }]);
        run(w, 300);
        expect(tank.position).toEqual(cellCenter({ x: 8, y: 3 }));
    });

    it('stop clears orders and the path', () => {
        const w = world();
        const tank = w.spawnUnit('t_tank', 0, cellCenter({ x: 3, y: 3 }));
        w.schedule({ type: 'move', playerId: 0, unitIds: [tank.id], target: cellCenter({ x: 6, y: 12 }) });
        run(w, 5);
        w.schedule({ type: 'stop', playerId: 0, unitIds: [tank.id] });
        run(w, 1);
        expect(tank.orders).toEqual([]);
        expect(tank.waypoints).toEqual([]);
    });

    it('drops invalid commands', () => {
        const w = world();
        const tank = w.spawnUnit('t_tank', 0, cellCenter({ x: 3, y: 3 }));
        w.schedule({ type: 'move', playerId: 0, unitIds: [], target: { x: 1, y: 1 } });
        w.schedule({ type: 'move', playerId: 0, unitIds: [tank.id], target: { x: 1.5, y: 1 } });
        w.schedule({ type: 'move', playerId: 7, unitIds: [tank.id], target: { x: 1000, y: 1000 } });
        w.step();
        expect(tank.waypoints).toEqual([]);
    });

    it('pushes overlapping units apart', () => {
        const w = world();
        const a = w.spawnUnit('t_tank', 0, { x: 5000, y: 5000 });
        const b = w.spawnUnit('t_tank', 0, { x: 5100, y: 5000 });
        run(w, 1);
        expect(length(vsub(a.position, b.position))).toBeGreaterThanOrEqual(a.stats.radius + b.stats.radius - 1);
    });

    it('never lets a smaller class push a bigger one', () => {
        const w = world();
        const big = w.spawnUnit('t_hq', 0, { x: 5000, y: 5000 });
        w.spawnUnit('t_tank', 0, { x: 5100, y: 5000 });
        run(w, 1);
        expect(big.position).toEqual({ x: 5000, y: 5000 });
    });

    it('counts population and frees it when a unit dies', () => {
        const w = world();
        const tank = w.spawnUnit('t_tank', 0, cellCenter({ x: 3, y: 3 }));
        w.spawnUnit('t_hq', 0, cellCenter({ x: 3, y: 10 }));
        expect(w.players.get(0)!.population).toBe(2);
        tank.dead = true;
        w.step();
        expect(w.units.has(tank.id)).toBe(false);
        expect(w.players.get(0)!.population).toBe(0);
    });

    it('ends the match when an HQ dies', () => {
        const w = world();
        const mine = w.spawnUnit('t_hq', 0, cellCenter({ x: 3, y: 10 }));
        w.spawnUnit('t_hq', 1, cellCenter({ x: 20, y: 10 }));
        mine.dead = true;
        w.step();
        expect(w.players.get(0)!.defeated).toBe(true);
        expect(w.winner).toBe(1);
    });

    it('converts HLD units into sim stats', () => {
        const tank = world().spawnUnit('t_tank', 0, { x: 5000, y: 5000 });
        // Medium: 12 x 6 m = 1200 x 600 sim units, radius (12 + 6) / 4 = 4.5 m.
        expect(tank.stats).toMatchObject({ length: 1200, width: 600, radius: 450, population: 2, captureWeight: 2 });
        // 25 m/s = 2500 units/s = 125 units/tick (×1024 fixed point).
        expect(tank.stats.topSpeedFx).toBe(125 * 1024);
        // 150 m range; 2 shots/s = every 10 ticks; 100 m/s = 500 units/tick.
        expect(tank.weapons[0].weapon).toMatchObject({ range: 15000, cooldownTicks: 10, projectileSpeed: 500 });
    });
});
