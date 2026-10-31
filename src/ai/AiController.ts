import { metres, ticks } from '../data/convert';
import type { AiDef, Resources, SizeClass, UnitDef } from '../data/types';
import type { Command } from '../sim/commands';
import { UNITS_PER_TILE, atan2Steps, fromAngle, idiv, length, vadd, vsub, type Vec } from '../sim/math';
import type { PlayerState } from '../sim/state';
import type { SimUnit } from '../sim/unit';
import { insideCaptureArea } from '../sim/capture';
import { isAutomatic } from '../sim/upgrades';
import type { SimWorld } from '../sim/world';

/**
 * The computer opponent for one player (HLD "AI opponent"). It reads the simulation and returns
 * Commands, exactly like a human's input; its only advantage is the income bonus, which the sim
 * applies. It thinks a few times a second, in a fixed order of small managers:
 * - economy: keep a number of extractors, send idle ones to the nearest reserve;
 * - expansion: keep a few fast unarmed units capturing requisition points;
 * - production: keep the HQ queue busy with combat units, following a size-class mix;
 * - research: buy upgrades in faction order when resources are spare; apply per-unit upgrades;
 * - army: gather at a rally point, defend the HQ and owned points, attack when strong enough,
 *   fall back when weakened.
 * All tuning comes from content/ai.json. Deterministic: integers, units in id order, no
 * randomness, so every machine computes the same AI commands (lockstep-ready).
 */
/**
 * What one decision may still spend. The AI never changes sim state itself: it works on a copy
 * of its resources, queue and population, so two managers don't spend the same manpower.
 */
interface Budget {
    resources: Resources;
    queue: string[];
    population: number;
}

export class AiController {
    private readonly tuning: AiDef;
    private readonly interval: number;
    /** Last known position of each enemy HQ (its spawn until seen elsewhere). */
    private readonly enemyHqs = new Map<number, Vec>();
    private attacking = false;
    /** The target the army was last sent to, so it gets one order per target. */
    private armyTarget: Vec | undefined;

    constructor(readonly playerId: number, world: SimWorld) {
        this.tuning = world.data.ai;
        this.interval = Math.max(1, ticks(this.tuning.thinkInterval));
        for (const p of world.players.values()) {
            const hq = world.hqOf(p.id);
            if (hq && world.areEnemies(playerId, p.id)) this.enemyHqs.set(p.id, { ...hq.position });
        }
    }

    /** Called every tick; decides only every `thinkInterval` (offset per player). */
    think(world: SimWorld): Command[] {
        if ((world.tick + this.playerId) % this.interval !== 0) return [];
        const player = world.players.get(this.playerId);
        const hq = world.hqOf(this.playerId);
        if (!player || player.defeated || !hq) return [];
        const out: Command[] = [];
        const own = [...world.units.values()].filter((u) => u.playerId === this.playerId && !u.dead);
        const roles = this.roles(world, player);
        const budget: Budget = { resources: { ...player.resources }, queue: player.queue.map((e) => e.unitDefId), population: player.population };

        this.economy(world, budget, own, roles, out);
        this.expansion(world, budget, own, roles, out);
        // Once there is an army to protect it, research gets first claim on the resources.
        const established = own.filter((u) => !u.isHq && u.weapons.length > 0 && !u.stats.extraction).length >= 6;
        if (established) this.research(world, player, budget, own, out);
        this.production(world, budget, own, roles, out);
        if (!established) this.research(world, player, budget, own, out);
        this.army(world, hq, own, out);
        return out;
    }

    /** The faction's units sorted into what the AI uses them for, from their data. */
    private roles(world: SimWorld, player: PlayerState): { extractor?: UnitDef; capturer?: UnitDef; combat: UnitDef[] } {
        const defs = world.data.faction(player.faction)!.units.map((id) => world.data.requireUnit(id));
        const extractor = defs.find((d) => d.extraction);
        // The fastest unarmed unit captures points.
        const capturer = defs.filter((d) => !d.extraction && d.weapons.length === 0).sort((a, b) => b.topSpeed - a.topSpeed)[0];
        const combat = defs.filter((d) => d !== extractor && d.weapons.length > 0);
        return { extractor, capturer, combat };
    }

    private economy(world: SimWorld, budget: Budget, own: SimUnit[], roles: ReturnType<AiController['roles']>, out: Command[]): void {
        if (!roles.extractor) return;
        const extractors = own.filter((u) => u.stats.extraction);
        const queued = budget.queue.filter((id) => id === roles.extractor!.id).length;
        if (extractors.length + queued < this.tuning.extractors) this.recruit(world, budget, roles.extractor, out);

        const hq = world.hqOf(this.playerId)!;
        for (const u of extractors) {
            if (u.orders.length > 0) continue;
            // Nearest non-empty reserve to the HQ that has fewer than two of our extractors.
            const busy = (id: number) => extractors.filter((e) => e.orders[0]?.type === 'gather' && e.orders[0].reserveId === id).length;
            const reserve = [...world.reserves.values()]
                .filter((r) => r.amountLeft > 0 && busy(r.id) < 2)
                .sort((a, b) => dist(a.position, hq.position) - dist(b.position, hq.position) || a.id - b.id)[0];
            if (reserve) out.push({ type: 'gather', playerId: this.playerId, unitIds: [u.id], reserveId: reserve.id });
        }
    }

    private expansion(world: SimWorld, budget: Budget, own: SimUnit[], roles: ReturnType<AiController['roles']>, out: Command[]): void {
        if (!roles.capturer) return;
        const capturers = own.filter((u) => u.defId === roles.capturer!.id);
        const queued = budget.queue.filter((id) => id === roles.capturer!.id).length;
        if (capturers.length + queued < this.tuning.capturers) this.recruit(world, budget, roles.capturer, out);

        const taken = new Set(capturers.map((u) => (u.orders[0]?.type === 'capture' ? u.orders[0].pointId : -1)));
        for (const u of capturers) {
            if (u.orders.length > 0) continue;
            const point = [...world.reqPoints.values()]
                .filter((p) => p.owner !== this.playerId && !taken.has(p.id))
                .sort((a, b) => dist(a.position, u.position) - dist(b.position, u.position) || a.id - b.id)[0];
            if (!point) continue;
            taken.add(point.id);
            out.push({ type: 'capture', playerId: this.playerId, unitIds: [u.id], pointId: point.id });
        }
    }

    private production(world: SimWorld, budget: Budget, own: SimUnit[], roles: ReturnType<AiController['roles']>, out: Command[]): void {
        // Extractors and capturers first; keep at most two units queued.
        if (budget.queue.length >= 2 || roles.combat.length === 0) return;
        const army = own.filter((u) => !u.isHq && u.weapons.length > 0 && !u.stats.extraction);
        const queued = budget.queue.map((id) => world.data.requireUnit(id));
        const count = (c: SizeClass) => army.filter((u) => u.sizeClass === c).length + queued.filter((d) => d.sizeClass === c && d.weapons.length > 0).length;
        const total = army.length + queued.length;
        // The size class furthest below its wanted share.
        const classes = (['light', 'medium', 'heavy'] as const).filter((c) => roles.combat.some((d) => d.sizeClass === c));
        const wanted = classes.sort((a, b) => count(a) * 100 - this.tuning.armyMix[a] * total - (count(b) * 100 - this.tuning.armyMix[b] * total))[0];
        if (!wanted) return;
        // The strongest (most expensive) affordable unit of that class; if none, the strongest
        // affordable combat unit of any class, so scarce oil or metal never stalls production.
        const strongest = (defs: UnitDef[]) => defs.filter((d) => affords(budget, d.cost)).sort((a, b) => (b.cost.manpower ?? 0) - (a.cost.manpower ?? 0) || (a.id < b.id ? -1 : 1))[0];
        const def = strongest(roles.combat.filter((d) => d.sizeClass === wanted)) ?? strongest(roles.combat);
        if (def) this.recruit(world, budget, def, out);
    }

    private research(world: SimWorld, player: PlayerState, budget: Budget, own: SimUnit[], out: Command[]): void {
        const faction = world.data.faction(player.faction)!;
        if (!player.research) {
            const next = faction.upgrades.find((id) => !player.researched.includes(id));
            const up = next ? world.data.upgrade(next) : undefined;
            if (up && affords(budget, sum(up.cost, this.tuning.researchReserve))) {
                spend(budget, up.cost);
                out.push({ type: 'research', playerId: this.playerId, upgradeId: up.id });
            }
        }
        for (const id of player.researched) {
            const up = world.data.upgrade(id)!;
            if (isAutomatic(up)) continue;
            const targets = own.filter((u) => u.defId === up.appliesTo && !u.upgrades.includes(up.id));
            if (targets.length > 0 && affords(budget, up.applyCost ?? {})) {
                spend(budget, up.applyCost ?? {});
                out.push({ type: 'applyUpgrade', playerId: this.playerId, upgradeId: up.id, unitIds: targets.map((u) => u.id) });
            }
        }
    }

    private army(world: SimWorld, hq: SimUnit, own: SimUnit[], out: Command[]): void {
        const army = own.filter((u) => !u.isHq && u.weapons.length > 0 && !u.stats.extraction);
        if (army.length === 0) return;
        const ids = (units: SimUnit[]) => units.map((u) => u.id);
        const strength = army.reduce((s, u) => s + (world.data.requireUnit(u.defId).cost.manpower ?? 0), 0);

        // Keep enemy HQ positions up to date while they're visible.
        for (const [id] of this.enemyHqs) {
            const enemyHq = world.hqOf(id);
            if (enemyHq && world.isVisibleTo(this.playerId, enemyHq.position)) this.enemyHqs.set(id, { ...enemyHq.position });
        }

        // Defend: visible enemies near the HQ or an owned point.
        const guarded = [hq.position, ...[...world.reqPoints.values()].filter((p) => p.owner === this.playerId).map((p) => p.position)];
        const radius = metres(this.tuning.defendRadius);
        const intruder = [...world.units.values()].find(
            (u) => !u.dead && world.areEnemies(this.playerId, u.playerId) && world.isVisibleTo(this.playerId, u.position) && guarded.some((g) => dist(g, u.position) <= radius),
        );
        if (intruder && !this.attacking) {
            const free = army.filter((u) => u.orders[0]?.type !== 'attackMove');
            if (free.length > 0) out.push({ type: 'attackMove', playerId: this.playerId, unitIds: ids(free), target: { ...intruder.position } });
            return;
        }

        if (this.attacking && strength < this.tuning.retreatStrength) this.attacking = false;
        else if (!this.attacking && strength >= this.tuning.attackStrength) this.attacking = true;

        const idle = army.filter((u) => u.orders.length === 0);
        if (this.attacking) {
            // Idle units standing on a point that isn't ours take it (attack-moving there doesn't).
            const capturing = new Set<number>();
            for (const point of world.reqPoints.values()) {
                if (point.owner === this.playerId) continue;
                const here = idle.filter((u) => insideCaptureArea(world, point, u.position));
                if (here.length === 0) continue;
                for (const u of here) capturing.add(u.id);
                out.push({ type: 'capture', playerId: this.playerId, unitIds: ids(here), pointId: point.id });
            }
            const target = this.attackTarget(world, army);
            if (!target) return;
            const changed = !this.armyTarget || dist(target, this.armyTarget) > metres(this.tuning.rallyDistance);
            // One order for the whole army per target; afterwards only idle units (new or arrived) join.
            const send = changed ? army : idle.filter((u) => !capturing.has(u.id));
            if (send.length > 0) out.push({ type: 'attackMove', playerId: this.playerId, unitIds: ids(send), target });
            this.armyTarget = target;
            return;
        }
        // Not attacking: gather idle units at the rally point.
        this.armyTarget = undefined;
        const rally = this.rallyPoint(world, hq);
        const away = idle.filter((u) => dist(u.position, rally) > idiv(metres(this.tuning.rallyDistance), 2));
        if (away.length > 0) out.push({ type: 'move', playerId: this.playerId, unitIds: ids(away), target: rally });
    }

    /** Where to attack: the nearest enemy-owned point to the army, else the enemy HQ's last known position. */
    private attackTarget(world: SimWorld, army: SimUnit[]): Vec | undefined {
        const centre = army.reduce((c, u) => ({ x: c.x + u.position.x, y: c.y + u.position.y }), { x: 0, y: 0 });
        const at = { x: idiv(centre.x, army.length), y: idiv(centre.y, army.length) };
        const point = [...world.reqPoints.values()]
            .filter((p) => p.owner >= 0 && world.areEnemies(this.playerId, p.owner))
            .sort((a, b) => dist(a.position, at) - dist(b.position, at) || a.id - b.id)[0];
        if (point) return { ...point.position };
        const [first] = [...this.enemyHqs.values()];
        return first ? { ...first } : undefined;
    }

    /** In front of the HQ, toward the map centre. */
    private rallyPoint(world: SimWorld, hq: SimUnit): Vec {
        const centre = { x: idiv(world.grid.width * UNITS_PER_TILE, 2), y: idiv(world.grid.height * UNITS_PER_TILE, 2) };
        const to = vsub(centre, hq.position);
        return vadd(hq.position, fromAngle(atan2Steps(to.y, to.x), metres(this.tuning.rallyDistance)));
    }

    /** Recruits a unit if the budget allows it, and books its cost and population. */
    private recruit(world: SimWorld, budget: Budget, def: UnitDef, out: Command[]): void {
        const rules = world.data.rules;
        const pop = rules.sizeClasses[def.sizeClass].population;
        if (budget.queue.length >= rules.productionQueueSize || budget.population + pop > rules.populationCap || !affords(budget, def.cost)) return;
        spend(budget, def.cost);
        budget.queue.push(def.id);
        budget.population += pop;
        out.push({ type: 'recruit', playerId: this.playerId, unitDefId: def.id });
    }
}

function dist(a: Vec, b: Vec): number {
    return length(vsub(a, b));
}

function affords(budget: Budget, cost: Resources): boolean {
    return Object.entries(cost).every(([res, n]) => (budget.resources[res] ?? 0) >= n);
}

function spend(budget: Budget, cost: Resources): void {
    for (const [res, n] of Object.entries(cost)) budget.resources[res] = (budget.resources[res] ?? 0) - n;
}

function sum(a: Resources, b: Resources): Resources {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
    return out;
}
