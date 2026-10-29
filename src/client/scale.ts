import { ANGLE_STEPS, UNITS_PER_TILE, type Vec } from '../sim/math';

/**
 * View scale: pixels per tile, and conversions between sim units and pixels. Only the client
 * uses these. The simulation never knows about pixels.
 */
export const TILE_SIZE = 32;

export function simToPx(v: Vec): { x: number; y: number } {
    return { x: (v.x * TILE_SIZE) / UNITS_PER_TILE, y: (v.y * TILE_SIZE) / UNITS_PER_TILE };
}

export function simLengthToPx(length: number): number {
    return (length * TILE_SIZE) / UNITS_PER_TILE;
}

/** A clicked world position (pixels) to an integer sim position, e.g. for a move target. */
export function pxToSim(x: number, y: number): Vec {
    return { x: Math.round((x * UNITS_PER_TILE) / TILE_SIZE), y: Math.round((y * UNITS_PER_TILE) / TILE_SIZE) };
}

export function stepsToRadians(steps: number): number {
    return (steps * Math.PI * 2) / ANGLE_STEPS;
}

/** "#4080ff" -> 0x4080ff for Phaser drawing calls. */
export function hexColor(color: string): number {
    return parseInt(color.replace('#', ''), 16);
}
