import { metres } from '../data/convert';
import { TICK_RATE } from './constants';
import { idiv, type Vec } from './math';
import type { PlayerState, SimReserve } from './state';
import type { SimUnit } from './unit';
import type { SimWorld } from './world';

/**
 * Resource income (HLD "Economy"): manpower from the base income and held requisition points,
 * oil and metal from extractors. All exact integers: fractions of a resource are kept in
 * `player.carry` and credited once they add up to a whole unit, so 12.5 manpower per second
 * really is 12.5. The AI's income bonus applies to everything it earns.
 */

export const TICKS_PER_MINUTE = 60 * TICK_RATE;
/** Carry units per whole resource: fine enough for per-second and per-minute rates with a percent bonus. */
export const INCOME_FRACTION = 100 * TICKS_PER_MINUTE;

/** Adds `carryUnits` (1/INCOME_FRACTION of a resource) to a player's income. */
function credit(player: PlayerState, resource: string, carryUnits: number): void {
    const total = (player.carry[resource] ?? 0) + carryUnits;
    const whole = idiv(total, INCOME_FRACTION);
    player.resources[resource] = (player.resources[resource] ?? 0) + whole;
    player.carry[resource] = total - whole * INCOME_FRACTION;
}

/** Credits `amount` whole units of a resource, plus the player's income bonus. */
export function creditAmount(player: PlayerState, resource: string, amount: number): void {
    credit(player, resource, amount * (100 + player.incomeBonusPercent) * (INCOME_FRACTION / 100));
}

/** Requisition points a player holds. */
export function heldPoints(world: SimWorld, playerId: number): number {
    let n = 0;
    for (const p of world.reqPoints.values()) if (p.owner === playerId) n++;
    return n;
}

/** Whether a position is inside a reserve's square footprint. */
export function insideReserve(world: SimWorld, reserve: SimReserve, at: Vec): boolean {
    const half = idiv(metres(world.data.rules.reserveSize), 2);
    return Math.abs(at.x - reserve.position.x) <= half && Math.abs(at.y - reserve.position.y) <= half;
}

export function stepEconomy(world: SimWorld): void {
    const rules = world.data.rules;
    for (const player of world.players.values()) {
        if (player.defeated) continue;
        const perSecond: Record<string, number> = { ...rules.baseIncome };
        perSecond.manpower = (perSecond.manpower ?? 0) + heldPoints(world, player.id) * rules.capture.incomePerPoint;
        for (const [res, rate] of Object.entries(perSecond)) {
            // rate per second = rate / TICK_RATE per tick = rate * 60 * 100 / INCOME_FRACTION.
            credit(player, res, rate * 60 * (100 + player.incomeBonusPercent));
        }
    }
    for (const unit of world.units.values()) {
        const order = unit.orders[0];
        if (order?.type === 'gather' && order.phase === 'extracting') extract(world, unit, order.reserveId);
    }
}

/**
 * One tick of extraction. Rates are per minute, accumulated exactly in `unit.extractCarry`; each
 * whole unit is taken from the reserve and either credited right away (Raiders, on the spot) or
 * added to the extractor's load (League, hauled to the HQ).
 */
function extract(world: SimWorld, unit: SimUnit, reserveId: number): void {
    const reserve = world.reserves.get(reserveId);
    const extraction = unit.stats.extraction;
    const player = world.players.get(unit.playerId);
    if (!reserve || !extraction || !player || reserve.amountLeft <= 0) return;
    const res = reserve.resource;
    if (extraction.mode === 'haul' && isFull(unit, res)) return;
    unit.extractCarry += extraction.ratePerMinute[res] ?? 0;
    while (unit.extractCarry >= TICKS_PER_MINUTE && reserve.amountLeft > 0) {
        unit.extractCarry -= TICKS_PER_MINUTE;
        reserve.amountLeft -= 1;
        if (extraction.mode === 'onSpot') creditAmount(player, res, 1);
        else unit.load[res] = (unit.load[res] ?? 0) + 1;
        if (extraction.mode === 'haul' && isFull(unit, res)) break;
    }
}

/** A hauling extractor that can't carry more of `resource`. */
export function isFull(unit: SimUnit, resource: string): boolean {
    return (unit.load[resource] ?? 0) >= (unit.stats.extraction?.maxLoad?.[resource] ?? 0);
}

/** Total resources a hauling extractor carries. */
export function loadTotal(unit: SimUnit): number {
    let n = 0;
    for (const v of Object.values(unit.load)) n += v;
    return n;
}

/** Hands a hauling extractor's load to its player (with the income bonus). */
export function deliverLoad(world: SimWorld, unit: SimUnit): void {
    const player = world.players.get(unit.playerId);
    if (!player) return;
    for (const res of Object.keys(unit.load).sort()) creditAmount(player, res, unit.load[res]);
    unit.load = {};
}
