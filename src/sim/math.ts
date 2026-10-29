/**
 * Deterministic integer maths for the simulation.
 *
 * JS numbers are doubles, but integers are exact up to 2^53 and +, -, * on them are exact.
 * Division goes through idiv() (truncating, like C). Keep intermediate values far below 2^53
 * (everything here stays under ~1e12). Never use Math.sin/cos/atan2/sqrt/pow in the simulation:
 * their results may differ between machines.
 *
 * Angles use ANGLE_STEPS per full turn (0 = +x, increasing toward +y, i.e. clockwise on screen).
 * sin/cos return fixed-point values where ONE means 1.0.
 */

export const UNITS_PER_TILE = 1000;
export const ANGLE_STEPS = 4096;
export const HALF_TURN = 2048;
export const QUARTER_TURN = 1024;
export const ONE = 1024;

export interface Vec {
    x: number;
    y: number;
}

export const vec = (x: number, y: number): Vec => ({ x, y });
export const vadd = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const vsub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const vequal = (a: Vec, b: Vec): boolean => a.x === b.x && a.y === b.y;

/** Integer division, truncating toward zero. */
export function idiv(a: number, b: number): number {
    return Math.trunc(a / b);
}

/** Modulo that is never negative. */
export function posmod(a: number, n: number): number {
    return ((a % n) + n) % n;
}

export function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
}

export function wrapAngle(angle: number): number {
    return posmod(angle, ANGLE_STEPS);
}

/** Shortest signed turn from `from` to `to`, in (-HALF_TURN, HALF_TURN]. */
export function angleDiff(from: number, to: number): number {
    const diff = posmod(to - from, ANGLE_STEPS);
    return diff > HALF_TURN ? diff - ANGLE_STEPS : diff;
}

/** sin(angle) * ONE, using Bhaskara I's approximation (error below 0.2%). */
export function sinFx(angle: number): number {
    let a = posmod(angle, ANGLE_STEPS);
    const negative = a >= HALF_TURN;
    if (negative) a -= HALF_TURN;
    const p = a * (HALF_TURN - a);
    const value = idiv(16 * p * ONE, 5 * HALF_TURN * HALF_TURN - 4 * p);
    return negative ? -value : value;
}

export function cosFx(angle: number): number {
    return sinFx(angle + QUARTER_TURN);
}

/** Angle of the vector (x, y) in steps. (0, 0) gives 0. Error below ~0.3 degrees. */
export function atan2Steps(y: number, x: number): number {
    if (x === 0 && y === 0) return 0;
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    const steep = ay > ax;
    // z = tan of the angle within the first octant, scaled by 4096.
    const z = idiv((steep ? ax : ay) * 4096, steep ? ay : ax);
    // atan(z) ~ (pi/4) z + 0.273 z (1 - z), in steps (pi/4 = 512, 0.273 rad ~ 178).
    let angle = idiv(512 * z + idiv(178 * z * (4096 - z), 4096), 4096);
    if (steep) angle = QUARTER_TURN - angle;
    if (x < 0) angle = HALF_TURN - angle;
    if (y < 0) angle = ANGLE_STEPS - angle;
    return wrapAngle(angle);
}

/** Integer square root (floor), by Newton's method. */
export function isqrt(n: number): number {
    if (n <= 0) return 0;
    let x = n;
    let y = idiv(x + 1, 2);
    while (y < x) {
        x = y;
        y = idiv(x + idiv(n, x), 2);
    }
    return x;
}

export function length(v: Vec): number {
    return isqrt(v.x * v.x + v.y * v.y);
}

/** A vector of length `magnitude` pointing at `angle`. */
export function fromAngle(angle: number, magnitude: number): Vec {
    return { x: idiv(cosFx(angle) * magnitude, ONE), y: idiv(sinFx(angle) * magnitude, ONE) };
}
