import { describe, expect, it } from 'vitest';
import { ANGLE_STEPS, ONE, QUARTER_TURN, angleDiff, atan2Steps, cosFx, idiv, isqrt, sinFx, wrapAngle } from '../../src/sim/math';

describe('sim math', () => {
    it('sin/cos hit the cardinal points', () => {
        expect(sinFx(0)).toBe(0);
        expect(sinFx(QUARTER_TURN)).toBe(ONE);
        expect(sinFx(3 * QUARTER_TURN)).toBe(-ONE);
        expect(cosFx(0)).toBe(ONE);
    });

    it('sin stays within 0.3% of the real value', () => {
        for (let a = 0; a < ANGLE_STEPS; a += 7) {
            const real = Math.sin((a / ANGLE_STEPS) * Math.PI * 2) * ONE;
            expect(Math.abs(sinFx(a) - real)).toBeLessThanOrEqual(ONE * 0.003 + 1);
        }
    });

    it('atan2 covers all quadrants within half a degree', () => {
        for (let a = 0; a < ANGLE_STEPS; a += 13) {
            const rad = (a / ANGLE_STEPS) * Math.PI * 2;
            const x = Math.round(Math.cos(rad) * 10000);
            const y = Math.round(Math.sin(rad) * 10000);
            expect(Math.abs(angleDiff(atan2Steps(y, x), a))).toBeLessThanOrEqual(6);
        }
        expect(atan2Steps(0, 0)).toBe(0);
    });

    it('angleDiff takes the short way round', () => {
        expect(angleDiff(10, 4090)).toBe(-16);
        expect(angleDiff(4090, 10)).toBe(16);
        expect(wrapAngle(-1)).toBe(ANGLE_STEPS - 1);
    });

    it('isqrt is the integer floor', () => {
        for (const n of [0, 1, 2, 3, 4, 15, 16, 17, 99, 100, 123456789, 4_000_000_000]) {
            expect(isqrt(n)).toBe(Math.floor(Math.sqrt(n)));
        }
    });

    it('idiv truncates toward zero', () => {
        expect(idiv(7, 2)).toBe(3);
        expect(idiv(-7, 2)).toBe(-3);
    });
});
