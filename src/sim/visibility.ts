import { cellOf } from './grid';
import { UNITS_PER_TILE, idiv, isqrt, type Vec } from './math';
import type { SimUnit } from './unit';
import type { SimWorld } from './world';

/**
 * Fog of war (HLD "Fog Of War"): each player sees the tiles within their units' spotting range,
 * unless an obstacle blocks the line of sight. "Fire at visible enemies" is a game rule, so this
 * runs in the simulation. Each player's grid is rebuilt every few ticks: from every unit, rays go
 * to each tile on the edge of its spotting circle and mark tiles until they hit an obstacle
 * (the obstacle tile itself is marked, so walls are seen).
 */

/** Ticks between rebuilds of the visibility grids (4 times a second). */
export const VISIBILITY_INTERVAL = 5;

export function stepVisibility(world: SimWorld): void {
    if (world.tick % VISIBILITY_INTERVAL !== 1) return;
    rebuildVisibility(world);
}

export function rebuildVisibility(world: SimWorld): void {
    for (const player of world.players.values()) player.visible.fill(0);
    for (const unit of world.units.values()) {
        const player = world.players.get(unit.playerId);
        if (player && !unit.dead) markVisible(world, player.visible, unit);
    }
}

function markVisible(world: SimWorld, visible: Uint8Array, unit: SimUnit): void {
    const grid = world.grid;
    const width = grid.width;
    const origin = cellOf(unit.position);
    const r = idiv(unit.stats.spottingRange, UNITS_PER_TILE);
    if (grid.isInside(origin)) visible[origin.y * width + origin.x] = 1;
    // Every tile on the circle's edge, one per row and column step, so the rays cover the disc.
    for (let dy = -r; dy <= r; dy++) {
        const dx = isqrt(r * r - dy * dy);
        castRay(world, visible, origin, { x: origin.x + dx, y: origin.y + dy });
        castRay(world, visible, origin, { x: origin.x - dx, y: origin.y + dy });
    }
    for (let dx = -r; dx <= r; dx++) {
        const dy = isqrt(r * r - dx * dx);
        castRay(world, visible, origin, { x: origin.x + dx, y: origin.y + dy });
        castRay(world, visible, origin, { x: origin.x + dx, y: origin.y - dy });
    }
}

/** Marks tiles from `a` toward `b` (Bresenham) until leaving the map or hitting an obstacle. */
function castRay(world: SimWorld, visible: Uint8Array, a: Vec, b: Vec): void {
    const grid = world.grid;
    const dx = Math.abs(b.x - a.x);
    const dy = -Math.abs(b.y - a.y);
    const sx = a.x < b.x ? 1 : -1;
    const sy = a.y < b.y ? 1 : -1;
    let err = dx + dy;
    let x = a.x;
    let y = a.y;
    while (x !== b.x || y !== b.y) {
        const e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            x += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y += sy;
        }
        const cell = { x, y };
        if (!grid.isInside(cell)) return;
        visible[y * grid.width + x] = 1;
        if (grid.isBlocked(cell)) return;
    }
}
