import { describe, expect, it } from 'vitest';
import { SimGrid } from '../../src/sim/grid';

/** 20x12 grid with a vertical wall at x=10 from y=0 to y=8 (gap below). */
function wallGrid(): SimGrid {
    const grid = new SimGrid(20, 12);
    grid.blockRect({ x: 10, y: 0, w: 1, h: 9 });
    grid.updateClearance();
    return grid;
}

describe('SimGrid', () => {
    it('computes clearance from walls and edges', () => {
        const grid = wallGrid();
        expect(grid.clearance({ x: 10, y: 0 })).toBe(0);
        expect(grid.clearance({ x: 0, y: 5 })).toBe(1);
        expect(grid.clearance({ x: 9, y: 5 })).toBe(1);
        expect(grid.clearance({ x: 5, y: 5 })).toBe(5);
    });

    it('finds a path around a wall', () => {
        const grid = wallGrid();
        const path = grid.findPath({ x: 2, y: 2 }, { x: 17, y: 2 }, 1);
        expect(path.at(-1)).toEqual({ x: 17, y: 2 });
        expect(path.every((c) => !grid.isBlocked(c))).toBe(true);
        expect(path.some((c) => c.y >= 9)).toBe(true);
    });

    it('keeps big units out of narrow gaps', () => {
        const grid = new SimGrid(20, 12);
        // Wall with a 1-tile gap at y=6.
        grid.blockRect({ x: 10, y: 0, w: 1, h: 6 });
        grid.blockRect({ x: 10, y: 7, w: 1, h: 5 });
        grid.updateClearance();
        expect(grid.findPath({ x: 2, y: 6 }, { x: 17, y: 6 }, 1).length).toBeGreaterThan(0);
        expect(grid.findPath({ x: 4, y: 6 }, { x: 15, y: 6 }, 2)).toEqual([]);
    });

    it('goes to the nearest free tile when the goal is blocked', () => {
        const grid = wallGrid();
        const path = grid.findPath({ x: 2, y: 2 }, { x: 10, y: 3 }, 1);
        const end = path.at(-1)!;
        expect(grid.isBlocked(end)).toBe(false);
        expect(Math.abs(end.x - 10)).toBe(1);
    });

    it('smoothing keeps only corners and every line is clear', () => {
        const grid = wallGrid();
        const start = { x: 2, y: 2 };
        const path = grid.findPath(start, { x: 17, y: 2 }, 1);
        const smooth = grid.smooth(start, path, 1);
        expect(smooth.length).toBeLessThan(path.length);
        let from = start;
        for (const point of smooth) {
            expect(grid.hasLine(from, point, 1)).toBe(true);
            from = point;
        }
    });
});
