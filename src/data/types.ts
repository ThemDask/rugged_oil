/**
 * Shapes of the static game data in content/*.json. Every file has a `type` field telling the
 * registry what it is. Distances are in tiles, speeds in tiles per second, times in seconds.
 * Cross-references use ids (globally unique, lower_snake_case, prefixed per faction).
 */

export type ResourceCost = Record<string, number>;

export interface GameRules {
    type: 'rules';
    /** Every resource a cost may use, e.g. ["workforce", "fuel", "metal"]. */
    resourceTypes: string[];
    startingResources: ResourceCost;
    supplyCap: number;
}

export interface FactionDef {
    type: 'faction';
    id: string;
    displayName: string;
    description?: string;
    /** Default player color, e.g. "#4080ff". */
    color: string;
    /** Unit ids spawned at match start. Must contain exactly one base vehicle. */
    startingUnits: string[];
}

export interface WeaponDef {
    displayName: string;
    damage: number;
    /** Tiles. */
    range: number;
    /** Seconds between shots. */
    cooldown: number;
    /** Tiles; 0 = single target. */
    splashRadius?: number;
    /** Tiles per second; 0 = instant hit. */
    projectileSpeed?: number;
    /** Target tag -> damage multiplier. */
    bonusVsTags?: Record<string, number>;
}

export interface UnitDef {
    type: 'unit';
    id: string;
    faction: string;
    displayName: string;
    description?: string;
    /** Free-form labels for damage bonuses, AI and UI, e.g. "vehicle", "gatherer". */
    tags: string[];
    /** Resource type -> amount. Keys must be listed in GameRules.resourceTypes. */
    cost: ResourceCost;
    /** Seconds to produce. */
    buildTime: number;
    /** Ids that must exist before this can be produced. */
    requires: string[];
    maxHealth: number;
    armor: number;
    sightRange: number;
    weapons: WeaponDef[];
    /** The player's base vehicle: produces units, does upgrades; losing it loses the match. */
    isBase: boolean;
    /** Unit ids this unit can produce (base vehicles only, same faction). */
    produces: string[];
    /** Top speed, tiles per second. */
    moveSpeed: number;
    /** Tiles per second gained per second. */
    acceleration: number;
    /** Degrees per second. */
    turnRate: number;
    /** Body size in tiles: pathing clearance, separation, selection. */
    radius: number;
    supply: number;
}

export interface MapDef {
    type: 'map';
    id: string;
    displayName: string;
    description?: string;
    maxPlayers: number;
    /** Map size in tiles. */
    width: number;
    height: number;
    /** Ground color until a background image exists, e.g. "#b8945f". */
    groundColor: string;
    /** Optional background image (asset key), stretched over the whole map. */
    background?: string;
    /** Solid areas in tiles. They block movement and pathing. */
    obstacles: { x: number; y: number; w: number; h: number }[];
    /** Start tiles, one per player slot. */
    spawns: { x: number; y: number }[];
}

export type ContentDef = GameRules | FactionDef | UnitDef | MapDef;
