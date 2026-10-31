import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data/content';
import type { ContentDef } from '../src/data/types';
import { faction, gameData, hq, map, mount, rules, unit, upgrade, weapon } from './fixtures';

describe('content', () => {
    const data = loadGameData();

    it('is valid', () => {
        expect(data.validate()).toEqual([]);
    });

    it('declares the three HLD resources', () => {
        expect(data.rules.resources).toEqual(['manpower', 'oil', 'metal']);
    });

    it('has both factions, each with an HQ, 5 recruitable units and 3 upgrades', () => {
        expect(data.factions().map((f) => f.id).sort()).toEqual(['league', 'raiders']);
        for (const f of data.factions()) {
            expect(data.unit(f.hq)?.isHq).toBe(true);
            expect(f.units).toHaveLength(5);
            expect(f.upgrades).toHaveLength(3);
        }
    });

    it('has the 256 x 256 test map', () => {
        expect(data.map('test_map')).toMatchObject({ width: 256, height: 256 });
    });
});

describe('validateContent', () => {
    const base = (): ContentDef[] => [rules(), faction(), hq(), unit(), weapon(), mount(), upgrade(), map()];
    const check = (replace: (defs: ContentDef[]) => ContentDef[]) => gameData(replace(base())).validate().join('\n');
    const swap = (defs: ContentDef[], def: ContentDef) => defs.map((d) => (d.type === def.type && 'id' in d && 'id' in def && d.id === def.id ? def : d));

    it('accepts the valid fixture', () => {
        expect(check((d) => d)).toBe('');
    });

    it('catches a faction whose HQ is not an HQ', () => {
        expect(check((d) => swap(d, faction({ hq: 't_tank' })))).toContain('must be an HQ');
    });

    it('catches undeclared resources', () => {
        expect(check((d) => swap(d, unit({ cost: { fuel: 5 } })))).toContain("undeclared resource 'fuel'");
    });

    it('catches unknown weapons and mounts', () => {
        expect(check((d) => swap(d, unit({ weapons: [{ weapon: 'nope', mount: 'nada' }] })))).toMatch(/unknown weapon 'nope'[\s\S]*unknown mount 'nada'/);
    });

    it('catches out-of-range percentages', () => {
        expect(check((d) => swap(d, weapon({ piercing: 120 })))).toContain('piercing must be between 0 and 100');
        expect(check((d) => swap(d, unit({ armour: { front: -1, side: 0, rear: 0 } })))).toContain('armour.front');
    });

    it('catches projectiles that fall short of the weapon range', () => {
        expect(check((d) => swap(d, weapon({ maxProjectileDistance: 100 })))).toContain('maxProjectileDistance');
    });

    it('catches bad movement stats', () => {
        expect(check((d) => swap(d, unit({ rotationSpeed: 0 })))).toContain('rotationSpeed must be > 0');
    });

    it('catches upgrades replacing a weapon the unit lacks', () => {
        const bad = upgrade({ effects: [{ type: 'replaceWeapon', from: 'cannon', to: 'gun' }] });
        expect(check((d) => swap(d, bad))).toContain("has no weapon 'cannon'");
    });

    it('catches map objects inside obstacles', () => {
        expect(check((d) => swap(d, map({ requisitionPoints: [{ x: 30, y: 5 }] })))).toContain('requisition point (30, 5) is inside an obstacle');
    });
});
