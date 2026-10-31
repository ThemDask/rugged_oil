import { GameData } from '../src/data/registry';
import type { ContentDef, FactionDef, GameRules, MapDef, MountDef, UnitDef, UpgradeDef, WeaponDef } from '../src/data/types';

/**
 * A small, self-contained content set for tests, so sim and validator tests don't change when
 * the real game data (content/) is rebalanced.
 */

export const rules = (): GameRules => ({
    type: 'rules',
    resources: ['manpower', 'oil', 'metal'],
    startingResources: { manpower: 500 },
    baseIncome: { manpower: 10 },
    populationCap: 100,
    productionQueueSize: 5,
    capture: { captureTime: 30, decayTime: 10, areaSize: 80, incomePerPoint: 10 },
    reserveSize: 60,
    reserveAmount: { oil: 100, metal: 150 },
    aiIncomeBonusPercent: 25,
    sizeClasses: {
        light: { length: 8, width: 4, population: 1, captureWeight: 1 },
        medium: { length: 12, width: 6, population: 2, captureWeight: 2 },
        heavy: { length: 16, width: 8, population: 5, captureWeight: 5 },
        hq: { length: 40, width: 24, population: 0, captureWeight: 5 },
    },
});

export const weapon = (overrides: Partial<WeaponDef> = {}): WeaponDef => ({
    type: 'weapon', id: 'gun', displayName: 'Gun', range: 150, rateOfFire: 2, damage: 50, piercing: 5,
    projectileSpeed: 100, maxProjectileDistance: 200, ...overrides,
});

export const mount = (overrides: Partial<MountDef> = {}): MountDef => ({
    type: 'mount', id: 'turret', displayName: 'Turret', arc: 360, rotationSpeed: 90, ...overrides,
});

export const unit = (overrides: Partial<UnitDef> = {}): UnitDef => ({
    type: 'unit', id: 't_tank', faction: 't', displayName: 'Tank', role: 'Medium tank', isHq: false, sizeClass: 'medium',
    armour: { front: 50, side: 40, rear: 40 }, health: 1500, spottingRange: 200, topSpeed: 25, acceleration: 2,
    rotationSpeed: 90, cost: { manpower: 300, oil: 20, metal: 30 }, recruitTime: 15,
    weapons: [{ weapon: 'gun', mount: 'turret' }], ...overrides,
});

export const hq = (overrides: Partial<UnitDef> = {}): UnitDef =>
    unit({ id: 't_hq', displayName: 'HQ', role: 'HQ', isHq: true, sizeClass: 'hq', health: 10000, topSpeed: 15, acceleration: 1, rotationSpeed: 15, cost: {}, recruitTime: 0, ...overrides });

export const faction = (overrides: Partial<FactionDef> = {}): FactionDef => ({
    type: 'faction', id: 't', displayName: 'Testers', color: '#4080ff', hq: 't_hq', units: ['t_tank'], upgrades: [], ...overrides,
});

export const upgrade = (overrides: Partial<UpgradeDef> = {}): UpgradeDef => ({
    type: 'upgrade', id: 't_plating', faction: 't', displayName: 'Plating', description: '+10 armour.', appliesTo: 't_tank',
    cost: { manpower: 300 }, researchTime: 60, apply: 'automatic', effects: [{ type: 'addArmour', amount: 10 }], ...overrides,
});

export const map = (overrides: Partial<MapDef> = {}): MapDef => ({
    type: 'map', id: 'm', displayName: 'Map', maxPlayers: 2, width: 64, height: 40, groundColor: '#c8955a',
    obstacles: [{ x: 30, y: 0, w: 2, h: 30 }], spawns: [{ x: 6, y: 20 }, { x: 57, y: 20 }],
    requisitionPoints: [{ x: 32, y: 35 }], reserves: [{ x: 10, y: 5, resource: 'oil' }], ...overrides,
});

/** A GameData built from content definitions (defaults: the fixtures above). */
export function gameData(defs: ContentDef[] = [rules(), faction(), hq(), unit(), weapon(), mount(), upgrade(), map()]): GameData {
    return new GameData(Object.fromEntries(defs.map((d, i) => [`fixture/${i}.json`, d])));
}
