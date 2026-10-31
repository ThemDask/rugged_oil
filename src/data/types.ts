/**
 * Shapes of the static game data in content/*.json. Every file has a `type` field telling the
 * registry what it is. Values are in HLD units: metres, seconds, degrees, metres per second.
 * src/data/convert.ts turns them into integer sim units. Cross-references use ids (globally
 * unique, lower_snake_case, prefixed per faction: league_, raiders_).
 */

/** Resource id -> amount, e.g. { manpower: 300, oil: 20 }. Keys must be in GameRules.resources. */
export type Resources = Record<string, number>;

export type SizeClass = 'light' | 'medium' | 'heavy' | 'hq';
export const SIZE_CLASSES: SizeClass[] = ['light', 'medium', 'heavy', 'hq'];

export interface SizeClassDef {
    /** Default footprint in metres, seen from above, facing right. */
    length: number;
    width: number;
    /** Population used (the HQ uses 0). */
    population: number;
    /** Weight when capturing requisition points. */
    captureWeight: number;
}

export interface GameRules {
    type: 'rules';
    /** Every resource a cost may use, in HUD order: ["manpower", "oil", "metal"]. */
    resources: string[];
    startingResources: Resources;
    /** Background income per second, before requisition points. */
    baseIncome: Resources;
    populationCap: number;
    productionQueueSize: number;
    capture: {
        /** Seconds to capture (and to neutralise) a point at weight 1. */
        captureTime: number;
        /** Seconds progress decays after the capturers leave, before it drops to zero. */
        decayTime: number;
        /** Side of the square capture area, metres. */
        areaSize: number;
        /** Manpower per second for each held point. */
        incomePerPoint: number;
    };
    /** Amount in each reserve of a resource, e.g. { oil: 100, metal: 150 }. */
    reserveAmount: Resources;
    /** AI cheat: extra percent on all its resource income. */
    aiIncomeBonusPercent: number;
    sizeClasses: Record<SizeClass, SizeClassDef>;
}

export interface FactionDef {
    type: 'faction';
    id: string;
    displayName: string;
    description?: string;
    /** Default team colour, e.g. "#4080ff". */
    color: string;
    /** The faction's HQ unit id (exactly one, spawned at match start). */
    hq: string;
    /** Units the HQ can recruit, in recruit-button order. */
    units: string[];
    /** Upgrades researched at the HQ, in button order. */
    upgrades: string[];
}

export interface WeaponDef {
    type: 'weapon';
    id: string;
    displayName: string;
    /** Metres. */
    range: number;
    /** Shots per second. */
    rateOfFire: number;
    damage: number;
    /** Percent of the damage that ignores armour, 0-100. */
    piercing: number;
    /** Metres per second. */
    projectileSpeed: number;
    /** Metres a projectile flies before it disappears. */
    maxProjectileDistance: number;
}

export interface MountDef {
    type: 'mount';
    id: string;
    displayName: string;
    /** Firing arc in degrees, centred on the hull's front (360 = all around). */
    arc: number;
    /** Degrees per second. */
    rotationSpeed: number;
}

export interface WeaponSlot {
    weapon: string;
    mount: string;
}

export interface ArmourDef {
    /** Percent of non-piercing damage blocked, 0-100, per side. */
    front: number;
    side: number;
    rear: number;
}

export interface ExtractionDef {
    /** 'haul': carry loads back to the HQ (League). 'onSpot': income arrives while gathering (Raiders). */
    mode: 'haul' | 'onSpot';
    /** Resource -> amount gathered per minute. */
    ratePerMinute: Resources;
    /** Resource -> max load carried ('haul' only). */
    maxLoad?: Resources;
}

export interface UnitDef {
    type: 'unit';
    id: string;
    faction: string;
    displayName: string;
    /** The HLD's "Type" column, e.g. "Medium tank", "extractor". Shown in the UI. */
    role: string;
    isHq: boolean;
    sizeClass: SizeClass;
    /** Overrides the size class footprint, metres. */
    size?: { length: number; width: number };
    armour: ArmourDef;
    health: number;
    /** Metres. */
    spottingRange: number;
    /** Metres per second. */
    topSpeed: number;
    /** Metres per second per second. */
    acceleration: number;
    /** Hull rotation, degrees per second. */
    rotationSpeed: number;
    cost: Resources;
    /** Seconds. */
    recruitTime: number;
    weapons: WeaponSlot[];
    /** Only for extractors. */
    extraction?: ExtractionDef;
}

export type UpgradeEffect =
    | { type: 'addArmour'; amount: number }
    | { type: 'addStat'; stat: 'topSpeed' | 'acceleration'; amount: number }
    | { type: 'addWeapon'; slot: WeaponSlot }
    | { type: 'replaceWeapon'; from: string; to: string };

export interface UpgradeDef {
    type: 'upgrade';
    id: string;
    faction: string;
    displayName: string;
    description: string;
    /** 'faction' for faction-wide upgrades, otherwise a unit id of the same faction. */
    appliesTo: string;
    cost: Resources;
    /** Seconds. */
    researchTime: number;
    /** 'automatic': active for all current and future units once researched. Otherwise applied per unit for `applyCost`. */
    apply: 'automatic' | 'perUnit';
    applyCost?: Resources;
    effects: UpgradeEffect[];
}

/** A tile rectangle. */
export interface TileRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface MapDef {
    type: 'map';
    id: string;
    displayName: string;
    description?: string;
    maxPlayers: number;
    /** Map size in tiles (1 tile = 10 m). */
    width: number;
    height: number;
    /** Ground colour until a background image exists, e.g. "#c8955a". */
    groundColor: string;
    /** Optional background image (asset key), stretched over the whole map. */
    background?: string;
    /** Solid areas in tiles. They block movement, vision and shots. */
    obstacles: (TileRect & { sprite?: string })[];
    /** HQ start tiles, one per player slot. */
    spawns: { x: number; y: number }[];
    /** Requisition point tiles. */
    requisitionPoints: { x: number; y: number }[];
    /** Oil and metal reserves. The amount comes from GameRules.reserveAmount. */
    reserves: { x: number; y: number; resource: string }[];
}

export type ContentDef = GameRules | FactionDef | UnitDef | WeaponDef | MountDef | UpgradeDef | MapDef;
