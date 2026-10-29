import { describe, expect, it } from 'vitest';
import { formationBlock } from '../../src/sim/formation';

describe('formationBlock', () => {
    it('handles empty and single groups', () => {
        expect(formationBlock({ x: 0, y: 0 }, 0, 10)).toEqual([]);
        expect(formationBlock({ x: 5, y: 5 }, 1, 10)).toEqual([{ x: 5, y: 5 }]);
    });

    it('centers a block on the target', () => {
        const points = formationBlock({ x: 100, y: 200 }, 4, 10);
        expect(points).toHaveLength(4);
        const mean = points.reduce((s, p) => ({ x: s.x + p.x / 4, y: s.y + p.y / 4 }), { x: 0, y: 0 });
        expect(mean).toEqual({ x: 100, y: 200 });
    });

    it('keeps points apart by at least the spacing', () => {
        const points = formationBlock({ x: 0, y: 0 }, 7, 10);
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                expect(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)).toBeGreaterThanOrEqual(10);
            }
        }
    });
});
