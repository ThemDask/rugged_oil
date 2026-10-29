import { idiv, isqrt, type Vec } from './math';

/**
 * A roughly square block of `count` points centered on `center`, so a group of units doesn't
 * pile up on one target. Integer sim units.
 */
export function formationBlock(center: Vec, count: number, spacing: number): Vec[] {
    if (count <= 0) return [];
    let cols = isqrt(count);
    if (cols * cols < count) cols += 1;
    const rows = idiv(count + cols - 1, cols);
    const originX = center.x - idiv((cols - 1) * spacing, 2);
    const originY = center.y - idiv((rows - 1) * spacing, 2);
    const points: Vec[] = [];
    for (let i = 0; i < count; i++) {
        points.push({ x: originX + (i % cols) * spacing, y: originY + idiv(i, cols) * spacing });
    }
    return points;
}

/** Distance between neighbours for units up to `radius` (sim units) in size. */
export function spacingFor(radius: number): number {
    return idiv(radius * 5, 2);
}
