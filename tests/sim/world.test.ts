import { describe, expect, it } from 'vitest';
import type { UnitDef } from '../../src/data/types';
import { SimGrid, cellCenter, cellOf } from '../../src/sim/grid';
import { length, vsub } from '../../src/sim/math';
import { SimWorld } from '../../src/sim/world';

const TANK: UnitDef = {
    type: 'unit', id: 't_tank', faction: 't', displayName: 'Tank', tags: [], cost: {}, buildTime: 1, requires: [],
    maxHealth: 100, armor: 0, sightRange: 5, weapons: [], isBase: false, produces: [],
    moveSpeed: 4, acceleration: 4, turnRate: 180, radius: 0.4, supply: 1,
};

/** 24x14 grid with a wall at x=12 from the top down to y=9. */
function world(): SimWorld {
    const grid = new SimGrid(24, 14);
    grid.blockRect({ x: 12, y: 0, w: 1, h: 10 });
    grid.updateClearance();
    return new SimWorld(grid, 42);
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
        const unit = w.spawnUnit(TANK, 0, cellCenter({ x: 3, y: 3 }));
        const target = cellCenter({ x: 20, y: 3 });
        w.schedule({ type: 'move', playerId: 0, unitIds: [unit.id], target });
        let enteredWall = false;
        run(w, 400, () => {
            if (w.grid.isBlocked(cellOf(unit.position))) enteredWall = true;
        });
        expect(enteredWall).toBe(false);
        expect(unit.position).toEqual(target);
        expect(unit.speed).toBe(0);
    });

    it('only moves units owned by the issuing player', () => {
        const w = world();
        const mine = w.spawnUnit(TANK, 0, cellCenter({ x: 3, y: 3 }));
        const theirs = w.spawnUnit(TANK, 1, cellCenter({ x: 3, y: 6 }));
        w.schedule({ type: 'move', playerId: 0, unitIds: [mine.id, theirs.id], target: cellCenter({ x: 6, y: 12 }) });
        w.step();
        expect(mine.waypoints.length).toBeGreaterThan(0);
        expect(theirs.waypoints).toEqual([]);
    });

    it('spreads a group over separate targets', () => {
        const w = world();
        const a = w.spawnUnit(TANK, 0, cellCenter({ x: 3, y: 3 }));
        const b = w.spawnUnit(TANK, 0, cellCenter({ x: 3, y: 5 }));
        w.schedule({ type: 'move', playerId: 0, unitIds: [a.id, b.id], target: cellCenter({ x: 6, y: 12 }) });
        w.step();
        expect(a.waypoints.at(-1)).not.toEqual(b.waypoints.at(-1));
    });

    it('drops invalid commands', () => {
        const w = world();
        const unit = w.spawnUnit(TANK, 0, cellCenter({ x: 3, y: 3 }));
        w.schedule({ type: 'move', playerId: 0, unitIds: [], target: { x: 1, y: 1 } });
        w.schedule({ type: 'move', playerId: 0, unitIds: [unit.id], target: { x: 1.5, y: 1 } });
        w.step();
        expect(unit.waypoints).toEqual([]);
    });

    it('pushes overlapping units apart', () => {
        const w = world();
        const a = w.spawnUnit(TANK, 0, { x: 5000, y: 5000 });
        const b = w.spawnUnit(TANK, 0, { x: 5100, y: 5000 });
        run(w, 1);
        expect(length(vsub(a.position, b.position))).toBeGreaterThanOrEqual(a.radius + b.radius - 1);
    });
});
