import type { Resources } from '../data/types';
import type { Vec } from './math';

/**
 * Plain-data state of everything in a match that isn't a unit: players, requisition points,
 * reserves and projectiles. All integers. SimWorld holds them in Maps iterated in id order.
 */

export interface ProductionEntry {
    unitDefId: string;
    /** What was paid, refunded in full on cancel. */
    paid: Resources;
    ticksLeft: number;
}

export interface PlayerState {
    id: number;
    faction: string;
    resources: Resources;
    /** Fractions of a resource not yet credited, in 1/INCOME_FRACTION units (see economy.ts). */
    carry: Resources;
    /** Extra percent on all resource income (the AI's cheat). */
    incomeBonusPercent: number;
    /** Population used by living units and queued units. */
    population: number;
    /** HQ production queue; the front entry is being recruited. */
    queue: ProductionEntry[];
    research: { upgradeId: string; ticksLeft: number } | null;
    researched: string[];
    /** One flag per tile: 1 = visible to this player (rebuilt every few ticks). */
    visible: Uint8Array;
    /** Set when this player's HQ is destroyed. */
    defeated: boolean;
}

export interface SimReqPoint {
    id: number;
    /** Centre, sim units. */
    position: Vec;
    /** Owning player, or -1 for neutral. */
    owner: number;
    /** Capture (or neutralise) progress, 0 to the capture time in ticks ×ONE. */
    progress: number;
    /** Player whose units are making progress, or -1. */
    capturer: number;
    /** Ticks left before abandoned progress drops to zero. */
    decayTicks: number;
}

export interface SimReserve {
    id: number;
    /** Centre, sim units. */
    position: Vec;
    resource: string;
    amountLeft: number;
}

export interface SimProjectile {
    id: number;
    playerId: number;
    /** The unit that fired it (for "attacked by" reactions). */
    sourceId: number;
    position: Vec;
    previousPosition: Vec;
    /** Direction of travel, angle steps. */
    direction: number;
    /** Sim units per tick. */
    speed: number;
    distanceLeft: number;
    damage: number;
    piercing: number;
    dead: boolean;
}
