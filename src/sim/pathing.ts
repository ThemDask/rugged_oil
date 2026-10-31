import { cellCenter, cellOf, clearanceFor, type SimGrid } from './grid';
import { idiv, type Vec } from './math';
import type { SimUnit } from './unit';

/**
 * Plans a unit's path to `target` and stores it as waypoints. Pathfinding clearance is sized by
 * half the unit's width, so it only uses gaps at least as wide as itself. An unreachable target
 * leaves no waypoints (the unit stays put).
 */
export function planPath(grid: SimGrid, unit: SimUnit, target: Vec): void {
    unit.waypoints = [];
    const needed = clearanceFor(idiv(unit.stats.width + 1, 2));
    const start = cellOf(unit.position);
    const goal = cellOf(target);
    const cells = grid.findPath(start, goal, needed);
    if (cells.length === 0) {
        if (start.x === goal.x && start.y === goal.y && grid.isPassable(goal, needed)) unit.waypoints = [{ ...target }];
        return;
    }
    unit.waypoints = grid.smooth(start, cells, needed).map(cellCenter);
    // Finish exactly on the target when its tile was reachable.
    const last = cells[cells.length - 1];
    if (last.x === goal.x && last.y === goal.y) unit.waypoints[unit.waypoints.length - 1] = { ...target };
}
