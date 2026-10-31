import { ticks, unitStats } from '../data/convert';
import type { UnitDef, UpgradeDef, UpgradeEffect } from '../data/types';
import type { ApplyUpgradeCommand, ResearchCommand } from './commands';
import { canAfford, pay } from './production';
import type { SimUnit } from './unit';
import type { SimWorld } from './world';

/**
 * Upgrades (HLD "Upgrades"): researched at the HQ, one at a time, paid when research starts.
 * Faction-wide upgrades and unit upgrades marked automatic are active for all current and future
 * units as soon as the research ends. Other unit upgrades must then be applied unit by unit
 * (`applyUpgrade`), paying the apply cost for each unit.
 *
 * Effects are data (four kinds: add armour, add stat, add weapon, replace weapon). A unit's
 * effective stats are its definition with all its active effects applied, converted to sim units
 * again; they're recomputed only when an upgrade becomes active, never every tick.
 */

export function research(world: SimWorld, command: ResearchCommand): void {
    const player = world.players.get(command.playerId)!;
    const faction = world.data.faction(player.faction);
    const upgrade = world.data.upgrade(command.upgradeId);
    if (!upgrade || !faction?.upgrades.includes(upgrade.id) || !world.hqOf(player.id)) return;
    if (player.research || player.researched.includes(upgrade.id) || !canAfford(player, upgrade.cost)) return;
    pay(player, upgrade.cost);
    player.research = { upgradeId: upgrade.id, ticksLeft: Math.max(1, ticks(upgrade.researchTime)) };
}

export function stepResearch(world: SimWorld): void {
    for (const player of world.players.values()) {
        if (!player.research) continue;
        player.research.ticksLeft -= 1;
        if (player.research.ticksLeft > 0) continue;
        const upgrade = world.data.upgrade(player.research.upgradeId)!;
        player.researched.push(upgrade.id);
        player.research = null;
        if (isAutomatic(upgrade)) {
            for (const unit of world.units.values()) if (unit.playerId === player.id && !unit.dead) refreshStats(world, unit);
        }
    }
}

export function applyUpgrade(world: SimWorld, command: ApplyUpgradeCommand): void {
    const player = world.players.get(command.playerId)!;
    const upgrade = world.data.upgrade(command.upgradeId);
    if (!upgrade || isAutomatic(upgrade) || !player.researched.includes(upgrade.id)) return;
    const ids = [...new Set(command.unitIds)].sort((a, b) => a - b);
    for (const id of ids) {
        const unit = world.units.get(id);
        if (!unit || unit.dead || unit.playerId !== player.id || unit.defId !== upgrade.appliesTo || unit.upgrades.includes(upgrade.id)) continue;
        const cost = upgrade.applyCost ?? {};
        if (!canAfford(player, cost)) break;
        pay(player, cost);
        unit.upgrades.push(upgrade.id);
        refreshStats(world, unit);
    }
}

/** Faction-wide upgrades are always automatic. */
export function isAutomatic(upgrade: UpgradeDef): boolean {
    return upgrade.appliesTo === 'faction' || upgrade.apply === 'automatic';
}

/** The upgrades active on a unit, in a fixed order: researched automatic ones, then applied ones. */
export function activeUpgrades(world: SimWorld, unit: SimUnit): UpgradeDef[] {
    const player = world.players.get(unit.playerId);
    const active: UpgradeDef[] = [];
    for (const id of player?.researched ?? []) {
        const up = world.data.upgrade(id)!;
        if (isAutomatic(up) && (up.appliesTo === 'faction' || up.appliesTo === unit.defId)) active.push(up);
    }
    for (const id of unit.upgrades) active.push(world.data.upgrade(id)!);
    return active;
}

/** Recomputes a unit's effective stats and weapons from its definition and active upgrades. */
export function refreshStats(world: SimWorld, unit: SimUnit): void {
    const effects = activeUpgrades(world, unit).flatMap((u) => u.effects);
    const stats = effects.length === 0 ? world.unitStatsOf(unit.defId) : unitStats(applyEffects(world.data.requireUnit(unit.defId), effects), world.data);
    const old = unit.weapons;
    unit.stats = stats;
    // Keep each mount's angle and cooldown when the slot stays; new slots start fresh.
    unit.weapons = stats.weapons.map((w, i) => ({
        weapon: w.weapon,
        mount: w.mount,
        mountAngle: old[i]?.mount.id === w.mount.id ? old[i].mountAngle : 0,
        cooldown: old[i] ? Math.min(old[i].cooldown, w.weapon.cooldownTicks) : 0,
        turnCarry: old[i]?.turnCarry ?? 0,
    }));
    unit.health = Math.min(unit.health, stats.health);
}

/** A copy of a unit definition with upgrade effects applied (still in HLD units). */
export function applyEffects(def: UnitDef, effects: UpgradeEffect[]): UnitDef {
    const out: UnitDef = { ...def, armour: { ...def.armour }, weapons: def.weapons.map((s) => ({ ...s })) };
    for (const e of effects) {
        switch (e.type) {
            case 'addArmour':
                out.armour = {
                    front: Math.min(100, out.armour.front + e.amount),
                    side: Math.min(100, out.armour.side + e.amount),
                    rear: Math.min(100, out.armour.rear + e.amount),
                };
                break;
            case 'addStat':
                out[e.stat] += e.amount;
                break;
            case 'addWeapon':
                out.weapons.push({ ...e.slot });
                break;
            case 'replaceWeapon':
                for (const s of out.weapons) if (s.weapon === e.from) s.weapon = e.to;
                break;
        }
    }
    return out;
}
