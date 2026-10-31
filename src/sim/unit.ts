import type { MountStats, UnitStats, WeaponStats } from '../data/convert';
import type { Resources, SizeClass } from '../data/types';
import { wrapAngle, type Vec } from './math';

/** A unit's current order. The front of SimUnit.orders is the one being carried out. */
export type Order =
    | { type: 'move'; target: Vec }
    | { type: 'attack'; targetId: number }
    | { type: 'attackMove'; target: Vec }
    | { type: 'capture'; pointId: number; target: Vec }
    | { type: 'gather'; reserveId: number; phase: GatherPhase };

/** Where an extractor is in its gather cycle. 'toHq' is only used by hauling (League) extractors. */
export type GatherPhase = 'toReserve' | 'extracting' | 'toHq';

/** One weapon on its mount. */
export interface WeaponState {
    weapon: WeaponStats;
    mount: MountStats;
    /** Mount angle relative to the hull, angle steps (0 = facing forward). */
    mountAngle: number;
    /** Ticks until it can fire again. */
    cooldown: number;
}

/**
 * One unit's state in the simulation. Integers only: positions in sim units (1 tile = 1000),
 * heading in angle steps, speed in sim units per tick ×ONE (fixed point).
 */
export interface SimUnit {
    id: number;
    playerId: number;
    defId: string;
    isHq: boolean;
    sizeClass: SizeClass;

    position: Vec;
    heading: number;
    /** Speed along the heading, sim units per tick ×ONE. */
    speedFx: number;
    /** Fraction of an angle step carried over between ticks (×ONE), so slow turn rates stay exact. */
    turnCarry: number;
    health: number;
    /** Remaining points of the current path. The last one is the destination. */
    waypoints: Vec[];
    orders: Order[];
    holdFire: boolean;
    weapons: WeaponState[];
    /** Per-unit upgrades applied to this unit. */
    upgrades: string[];
    /** League extractors: resources carried. */
    load: Resources;
    /** Extraction progress toward the next whole unit of resource, in 1/TICKS_PER_MINUTE units. */
    extractCarry: number;
    /** Marked when killed; removed at the end of the tick. */
    dead: boolean;

    /** State at the previous tick, so views can interpolate smoothly between ticks. */
    previousPosition: Vec;
    previousHeading: number;

    /** Effective stats: the unit type's stats plus active upgrade effects. */
    stats: UnitStats;
}

/** Creates a unit from its converted stats, at full health and standing still. */
export function createUnit(id: number, playerId: number, defId: string, isHq: boolean, sizeClass: SizeClass, stats: UnitStats, at: Vec, heading: number): SimUnit {
    const h = wrapAngle(heading);
    return {
        id,
        playerId,
        defId,
        isHq,
        sizeClass,
        position: { ...at },
        heading: h,
        speedFx: 0,
        turnCarry: 0,
        health: stats.health,
        waypoints: [],
        orders: [],
        holdFire: false,
        weapons: stats.weapons.map((w) => ({ weapon: w.weapon, mount: w.mount, mountAngle: 0, cooldown: 0 })),
        upgrades: [],
        load: {},
        extractCarry: 0,
        dead: false,
        previousPosition: { ...at },
        previousHeading: h,
        stats,
    };
}
