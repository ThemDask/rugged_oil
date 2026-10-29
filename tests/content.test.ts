import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data/content';
import type { FactionDef, GameRules, UnitDef } from '../src/data/types';
import { validateContent } from '../src/data/validate';

describe('content', () => {
    const data = loadGameData();

    it('is valid', () => {
        expect(data.validate()).toEqual([]);
    });

    it('declares the three resources', () => {
        expect(data.rules.resourceTypes).toEqual(expect.arrayContaining(['workforce', 'fuel', 'metal']));
    });

    it('has a faction with a base vehicle and a playable map', () => {
        expect(data.factions().length).toBeGreaterThan(0);
        expect(data.unit('a_base')?.isBase).toBe(true);
        expect(data.map('test_map')).toBeDefined();
    });
});

describe('validateContent catches', () => {
    const rules: GameRules = { type: 'rules', resourceTypes: ['fuel'], startingResources: {}, supplyCap: 10 };
    const faction: FactionDef = { type: 'faction', id: 'f', displayName: 'F', color: '#fff', startingUnits: ['f_base'] };
    const unit = (overrides: Partial<UnitDef>): UnitDef => ({
        type: 'unit', id: 'f_unit', faction: 'f', displayName: 'U', tags: [], cost: {}, buildTime: 1, requires: [],
        maxHealth: 10, armor: 0, sightRange: 5, weapons: [], isBase: false, produces: [],
        moveSpeed: 1, acceleration: 1, turnRate: 90, radius: 0.5, supply: 1, ...overrides,
    });
    const base = unit({ id: 'f_base', isBase: true, produces: ['f_unit'] });
    const check = (units: UnitDef[], factions = [faction]) => validateContent(rules, factions, units, []).join('\n');

    it('nothing in a valid fixture', () => {
        expect(check([base, unit({})])).toBe('');
    });

    it('a faction without exactly one base vehicle', () => {
        expect(check([unit({ id: 'f_base' })])).toContain('exactly one base vehicle');
    });

    it('undeclared resources', () => {
        expect(check([base, unit({ cost: { oil: 5 } })])).toContain("undeclared resource 'oil'");
    });

    it('production from non-base units and unknown ids', () => {
        expect(check([base, unit({ produces: ['f_base'] })])).toContain('only base vehicles can produce');
        expect(check([unit({ id: 'f_base', isBase: true, produces: ['nope'] })])).toContain("unknown unit 'nope'");
    });

    it('bad movement stats', () => {
        expect(check([base, unit({ turnRate: 0 })])).toContain('turnRate must be > 0');
    });
});
