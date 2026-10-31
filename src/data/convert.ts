import { TICK_RATE } from '../sim/constants';
import { ANGLE_STEPS, ONE, UNITS_PER_METRE } from '../sim/math';
import type { GameData } from './registry';
import type { ArmourDef, ExtractionDef, MountDef, UnitDef, WeaponDef } from './types';

/**
 * Converts content data (HLD units: metres, seconds, degrees) into the integers the simulation
 * uses. Runs once per unit type, not every tick. Only plain arithmetic and Math.round, which are
 * exact and identical on every machine.
 *
 * Fixed point (×ONE) is used for small per-tick rates, so slow vehicles don't round to zero.
 */

/** Metres -> sim units. */
export const metres = (m: number): number => Math.round(m * UNITS_PER_METRE);
/** Seconds -> ticks. */
export const ticks = (seconds: number): number => Math.round(seconds * TICK_RATE);
/** Degrees -> angle steps. */
export const degrees = (deg: number): number => Math.round((deg * ANGLE_STEPS) / 360);
/** Metres per second -> sim units per tick. */
export const speedPerTick = (mps: number): number => Math.round((mps * UNITS_PER_METRE) / TICK_RATE);
/** Metres per second -> sim units per tick, fixed point. */
export const speedPerTickFx = (mps: number): number => Math.round((mps * UNITS_PER_METRE * ONE) / TICK_RATE);
/** Metres per second² -> sim units per tick², fixed point. */
export const accelerationFx = (mps2: number): number => Math.round((mps2 * UNITS_PER_METRE * ONE) / (TICK_RATE * TICK_RATE));
/** Degrees per second -> angle steps per tick, fixed point. */
export const turnRateFx = (degPerSecond: number): number => Math.round((degPerSecond * ANGLE_STEPS * ONE) / (360 * TICK_RATE));

export interface WeaponStats {
    id: string;
    range: number;
    cooldownTicks: number;
    damage: number;
    piercing: number;
    /** Sim units per tick. */
    projectileSpeed: number;
    maxProjectileDistance: number;
}

export interface MountStats {
    id: string;
    /** Half the firing arc, angle steps (2048 = all around). */
    halfArc: number;
    turnRateFx: number;
}

export interface UnitStats {
    length: number;
    width: number;
    /** Circle used for movement and separation: (length + width) / 4. */
    radius: number;
    population: number;
    captureWeight: number;
    health: number;
    armour: ArmourDef;
    spottingRange: number;
    topSpeedFx: number;
    accelerationFx: number;
    turnRateFx: number;
    recruitTicks: number;
    weapons: { weapon: WeaponStats; mount: MountStats }[];
    /** Extraction rates stay per minute: the sim accumulates them exactly (see economy.ts). */
    extraction?: ExtractionDef;
}

export function weaponStats(w: WeaponDef): WeaponStats {
    return {
        id: w.id,
        range: metres(w.range),
        cooldownTicks: Math.max(1, Math.round(TICK_RATE / w.rateOfFire)),
        damage: w.damage,
        piercing: w.piercing,
        projectileSpeed: Math.max(1, speedPerTick(w.projectileSpeed)),
        maxProjectileDistance: metres(w.maxProjectileDistance),
    };
}

export function mountStats(m: MountDef): MountStats {
    return { id: m.id, halfArc: degrees(m.arc / 2), turnRateFx: turnRateFx(m.rotationSpeed) };
}

/** A unit type's base stats in sim units. Upgrade effects are applied on top later (M6). */
export function unitStats(def: UnitDef, data: GameData): UnitStats {
    const size = data.rules.sizeClasses[def.sizeClass];
    const length = metres(def.size?.length ?? size.length);
    const width = metres(def.size?.width ?? size.width);
    return {
        length,
        width,
        radius: Math.round((length + width) / 4),
        population: size.population,
        captureWeight: size.captureWeight,
        health: def.health,
        armour: { ...def.armour },
        spottingRange: metres(def.spottingRange),
        topSpeedFx: speedPerTickFx(def.topSpeed),
        accelerationFx: Math.max(1, accelerationFx(def.acceleration)),
        turnRateFx: Math.max(1, turnRateFx(def.rotationSpeed)),
        recruitTicks: ticks(def.recruitTime),
        weapons: def.weapons.map((s) => ({ weapon: weaponStats(data.requireWeapon(s.weapon)), mount: mountStats(data.requireMount(s.mount)) })),
        extraction: def.extraction,
    };
}
