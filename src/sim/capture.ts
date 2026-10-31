import { metres, ticks } from '../data/convert';
import { ONE, idiv, type Vec } from './math';
import type { SimReqPoint } from './state';
import type { SimWorld } from './world';

/**
 * Requisition point capture (HLD "Requisition points"):
 * - only units with a capture order for the point, inside its square, count;
 * - each side's weight is the sum of its units' capture weights (light 1, medium 2, heavy 5);
 * - the heavier side makes progress at speed 1 + (difference − 1) ÷ 9; equal sides pause;
 * - an enemy-owned point is first neutralised, then captured (each takes the capture time);
 * - progress made by another side is worn down first; the owner wears down an attacker's progress;
 * - with nobody capturing, progress decays slowly for the decay time, then drops to zero.
 * Progress is fixed point: a full capture is captureTime in ticks × ONE.
 */

/** How fast abandoned progress decays before it drops to zero: a quarter of the weight-1 speed. */
const DECAY_PER_TICK = ONE / 4;

/** Whether a position is inside a point's capture square. */
export function insideCaptureArea(world: SimWorld, point: SimReqPoint, at: Vec): boolean {
    const half = idiv(metres(world.data.rules.capture.areaSize), 2);
    return Math.abs(at.x - point.position.x) <= half && Math.abs(at.y - point.position.y) <= half;
}

/** Progress per tick for a weight advantage (×ONE): 1 + (weight − 1) / 9. */
export function captureSpeed(weight: number): number {
    return idiv((weight + 8) * ONE, 9);
}

export function stepCapture(world: SimWorld): void {
    const rules = world.data.rules.capture;
    const full = ticks(rules.captureTime) * ONE;
    for (const point of world.reqPoints.values()) {
        const weights = new Map<number, number>();
        for (const unit of world.units.values()) {
            const order = unit.orders[0];
            if (unit.dead || order?.type !== 'capture' || order.pointId !== point.id) continue;
            if (!insideCaptureArea(world, point, unit.position)) continue;
            weights.set(unit.playerId, (weights.get(unit.playerId) ?? 0) + unit.stats.captureWeight);
        }

        if (weights.size === 0) {
            decay(point);
            continue;
        }
        // Heaviest side first; ties broken by player id so the result is the same everywhere.
        const sides = [...weights.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
        const [side, weight] = sides[0];
        const advantage = weight - (sides[1]?.[1] ?? 0);
        if (advantage <= 0) continue;
        point.decayTicks = ticks(rules.decayTime);
        let speed = captureSpeed(advantage);

        if (point.capturer >= 0 && point.capturer !== side) {
            // Wear down another side's progress first.
            const used = Math.min(speed, point.progress);
            point.progress -= used;
            speed -= used;
            if (point.progress > 0) continue;
            point.capturer = -1;
        }
        if (point.owner === side) continue; // Already ours, and no one else's progress left.
        point.capturer = side;
        point.progress += speed;
        if (point.progress >= full) {
            point.progress = 0;
            if (point.owner >= 0) {
                point.owner = -1; // Neutralised; the same side goes on to capture it.
            } else {
                point.owner = side;
                point.capturer = -1;
            }
        }
    }
}

function decay(point: SimReqPoint): void {
    if (point.progress <= 0) return;
    if (point.decayTicks > 0) {
        point.decayTicks -= 1;
        point.progress = Math.max(0, point.progress - DECAY_PER_TICK);
    } else {
        point.progress = 0;
    }
    if (point.progress === 0) point.capturer = -1;
}
