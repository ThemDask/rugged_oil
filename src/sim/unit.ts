import type { UnitDef } from '../data/types';
import { ANGLE_STEPS, UNITS_PER_TILE, wrapAngle, type Vec } from './math';
import { TICK_RATE } from './constants';

/**
 * One unit's state in the simulation. Integers only: positions in sim units
 * (1 tile = UNITS_PER_TILE), heading in angle steps, speeds in sim units per tick.
 */
export interface SimUnit {
    id: number;
    playerId: number;
    defId: string;
    isBase: boolean;

    position: Vec;
    heading: number;
    /** Speed along the heading, sim units per tick. */
    speed: number;
    health: number;
    /** Remaining points to drive through. The last one is the destination. */
    waypoints: Vec[];

    /** State at the previous tick, so views can interpolate smoothly between ticks. */
    previousPosition: Vec;
    previousHeading: number;

    // Stats, converted from the UnitDef once at spawn.
    maxHealth: number;
    radius: number;
    maxSpeed: number;
    acceleration: number;
    turnRate: number;
}

/**
 * Creates a unit from its definition. Data is in tiles and seconds; it's converted once here to
 * integer sim units per tick. (The conversion uses plain arithmetic and Math.round, which are
 * exact and identical on every machine.)
 */
export function createUnit(def: UnitDef, id: number, playerId: number, at: Vec, heading: number): SimUnit {
    const perTick = UNITS_PER_TILE / TICK_RATE;
    const h = wrapAngle(heading);
    return {
        id,
        playerId,
        defId: def.id,
        isBase: def.isBase,
        position: { ...at },
        heading: h,
        speed: 0,
        health: def.maxHealth,
        waypoints: [],
        previousPosition: { ...at },
        previousHeading: h,
        maxHealth: def.maxHealth,
        radius: Math.round(def.radius * UNITS_PER_TILE),
        maxSpeed: Math.max(1, Math.round(def.moveSpeed * perTick)),
        acceleration: Math.max(1, Math.round((def.acceleration * perTick) / TICK_RATE)),
        turnRate: Math.max(1, Math.round((def.turnRate * ANGLE_STEPS) / 360 / TICK_RATE)),
    };
}
