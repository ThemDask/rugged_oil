import { unitStats, type UnitStats } from '../data/convert';
import type { GameData } from '../data/registry';
import { stepCapture } from './capture';
import { compareCommands, isValidCommand, type AttackCommand, type AttackMoveCommand, type CaptureCommand, type Command, type GatherCommand, type HoldFireCommand, type MoveCommand, type StopCommand } from './commands';
import { stepEconomy } from './economy';
import { formationBlock, spacingFor } from './formation';
import { cellOf, type SimGrid } from './grid';
import { metres } from '../data/convert';
import { clamp, idiv, type Vec } from './math';
import { stepMovement } from './movement';
import { giveOrder, stepOrders } from './orders';
import { cancelRecruit, recruit, stepProduction } from './production';
import { applyUpgrade, refreshStats, research, stepResearch } from './upgrades';
import { SimRng } from './rng';
import type { PlayerState, SimProjectile, SimReqPoint, SimReserve } from './state';
import { stepCombat } from './combat';
import { stepProjectiles } from './projectiles';
import { stepVisibility } from './visibility';
import { createUnit, type SimUnit, type WeaponState } from './unit';

/**
 * The deterministic simulation. Owns all game state and advances it in fixed ticks. Given the
 * same starting state and the same Commands, every machine computes the identical match.
 * Commands are validated here, so invalid ones are dropped the same way everywhere.
 *
 * Never import Phaser or anything from src/client here.
 */
export class SimWorld {
    tick = 0;
    readonly grid: SimGrid;
    readonly data: GameData;
    /** The only source of randomness for gameplay. */
    readonly rng: SimRng;
    /** All entity Maps are keyed by id. Ids only increase and Maps keep insertion order, so iteration is by ascending id. */
    readonly players = new Map<number, PlayerState>();
    readonly units = new Map<number, SimUnit>();
    readonly projectiles = new Map<number, SimProjectile>();
    readonly reqPoints = new Map<number, SimReqPoint>();
    readonly reserves = new Map<number, SimReserve>();
    /** The winning player once the match is over, otherwise -1. */
    winner = -1;

    private nextId = 1;
    private nextSequence = 0;
    private pending: Command[] = [];
    private readonly statsCache = new Map<string, UnitStats>();

    constructor(grid: SimGrid, seed: number, data: GameData) {
        this.grid = grid;
        this.rng = new SimRng(seed);
        this.data = data;
    }

    addPlayer(id: number, faction: string, incomeBonusPercent: number, team = id): PlayerState {
        const rules = this.data.rules;
        const player: PlayerState = {
            id,
            faction,
            team,
            resources: Object.fromEntries(rules.resources.map((r) => [r, rules.startingResources[r] ?? 0])),
            carry: Object.fromEntries(rules.resources.map((r) => [r, 0])),
            incomeBonusPercent,
            population: 0,
            queue: [],
            research: null,
            researched: [],
            visible: new Uint8Array(this.grid.width * this.grid.height),
            defeated: false,
        };
        this.players.set(id, player);
        return player;
    }

    /** Base stats of a unit type in sim units, converted once and cached. */
    unitStatsOf(defId: string): UnitStats {
        let stats = this.statsCache.get(defId);
        if (!stats) {
            stats = unitStats(this.data.requireUnit(defId), this.data);
            this.statsCache.set(defId, stats);
        }
        return stats;
    }

    /** Spawns a unit. Recruited units already counted their population when queued (`countPopulation` false). */
    spawnUnit(defId: string, playerId: number, at: Vec, heading = 0, countPopulation = true): SimUnit {
        const def = this.data.requireUnit(defId);
        const stats = this.unitStatsOf(defId);
        const unit = createUnit(this.nextId++, playerId, defId, def.isHq, def.sizeClass, stats, at, heading);
        this.units.set(unit.id, unit);
        // Upgrades the player has already researched apply to new units too.
        refreshStats(this, unit);
        const player = this.players.get(playerId);
        if (player && countPopulation) player.population += stats.population;
        return unit;
    }

    addReqPoint(at: Vec): SimReqPoint {
        const point: SimReqPoint = { id: this.nextId++, position: { ...at }, owner: -1, progress: 0, capturer: -1, decayTicks: 0 };
        this.reqPoints.set(point.id, point);
        return point;
    }

    addReserve(at: Vec, resource: string, amount: number): SimReserve {
        const reserve: SimReserve = { id: this.nextId++, position: { ...at }, resource, amountLeft: amount };
        this.reserves.set(reserve.id, reserve);
        return reserve;
    }

    /** Whether two players are enemies (different teams). */
    areEnemies(a: number, b: number): boolean {
        return this.players.get(a)?.team !== this.players.get(b)?.team;
    }

    /** Whether a position is currently visible to a player (see visibility.ts). */
    isVisibleTo(playerId: number, at: Vec): boolean {
        const player = this.players.get(playerId);
        if (!player) return false;
        const cell = cellOf(at);
        if (!this.grid.isInside(cell)) return false;
        return player.visible[cell.y * this.grid.width + cell.x] === 1;
    }

    /** Fires a weapon: a projectile leaves the shooter's centre in `direction`. */
    spawnProjectile(shooter: SimUnit, direction: number, w: WeaponState): SimProjectile {
        const p: SimProjectile = {
            id: this.nextId++,
            playerId: shooter.playerId,
            sourceId: shooter.id,
            position: { ...shooter.position },
            previousPosition: { ...shooter.position },
            direction,
            speed: w.weapon.projectileSpeed,
            distanceLeft: w.weapon.maxProjectileDistance,
            damage: w.weapon.damage,
            piercing: w.weapon.piercing,
            dead: false,
        };
        this.projectiles.set(p.id, p);
        return p;
    }

    /** The living HQ of a player, if any. */
    hqOf(playerId: number): SimUnit | undefined {
        for (const u of this.units.values()) if (u.playerId === playerId && u.isHq && !u.dead) return u;
        return undefined;
    }

    /** Queues a Command for the next tick (or for command.tick if that's later). */
    schedule(command: Command): void {
        command.tick = Math.max(command.tick ?? 0, this.tick + 1);
        command.sequence = this.nextSequence++;
        this.pending.push(command);
    }

    /** Advances the simulation by one tick. The order of the steps is fixed (LLD section 4). */
    step(): void {
        if (this.winner >= 0) return;
        this.tick += 1;
        for (const unit of this.units.values()) {
            unit.previousPosition = { ...unit.position };
            unit.previousHeading = unit.heading;
        }
        for (const p of this.projectiles.values()) p.previousPosition = { ...p.position };

        this.applyCommands();
        stepEconomy(this);
        stepProduction(this);
        stepResearch(this);
        stepCapture(this);
        stepVisibility(this);
        const units = [...this.units.values()];
        stepOrders(this, units);
        stepMovement(units, this.grid);
        stepCombat(this);
        stepProjectiles(this);
        this.cleanup();
    }

    /** Hash of the full simulation state. Equal on every machine while the simulations agree. */
    checksum(): number {
        let h = mix(0x811c9dc5, this.tick);
        h = mix(h, this.rng.getState());
        h = mix(h, this.winner);
        for (const p of this.players.values()) {
            for (const r of this.data.rules.resources) h = mix(mix(h, p.resources[r] ?? 0), p.carry[r] ?? 0);
            for (const e of p.queue) h = mix(h, e.ticksLeft);
            for (const v of [p.id, p.population, p.queue.length, p.researched.length, p.research?.ticksLeft ?? -1, p.defeated ? 1 : 0]) h = mix(h, v);
        }
        for (const u of this.units.values()) {
            for (const v of [u.id, u.playerId, u.position.x, u.position.y, u.heading, u.speedFx, u.health, u.orders.length, u.extractCarry]) h = mix(h, v);
            for (const w of u.weapons) h = mix(mix(h, w.mountAngle), w.cooldown);
            h = mix(mix(h, u.upgrades.length), u.stats.armour.front);
            for (const r of Object.keys(u.load).sort()) h = mix(h, u.load[r]);
        }
        for (const p of this.projectiles.values()) {
            for (const v of [p.id, p.position.x, p.position.y, p.distanceLeft]) h = mix(h, v);
        }
        for (const p of this.reqPoints.values()) {
            for (const v of [p.id, p.owner, p.progress, p.capturer, p.decayTicks]) h = mix(h, v);
        }
        for (const r of this.reserves.values()) h = mix(mix(h, r.id), r.amountLeft);
        return h;
    }

    private applyCommands(): void {
        const due = this.pending.filter((c) => (c.tick ?? 0) <= this.tick).sort(compareCommands);
        this.pending = this.pending.filter((c) => (c.tick ?? 0) > this.tick);
        for (const command of due) {
            if (!isValidCommand(command) || !this.players.has(command.playerId)) continue;
            switch (command.type) {
                case 'move':
                case 'attackMove':
                    this.executeMove(command);
                    break;
                case 'stop':
                    this.executeStop(command);
                    break;
                case 'holdFire':
                    this.executeHoldFire(command);
                    break;
                case 'attack':
                    this.executeAttack(command);
                    break;
                case 'capture':
                    this.executeCapture(command);
                    break;
                case 'gather':
                    this.executeGather(command);
                    break;
                case 'recruit':
                    recruit(this, command);
                    break;
                case 'cancelRecruit':
                    cancelRecruit(this, command);
                    break;
                case 'research':
                    research(this, command);
                    break;
                case 'applyUpgrade':
                    applyUpgrade(this, command);
                    break;
            }
        }
    }

    /** The command's units that exist, are alive and belong to its player, in id order. */
    private ownUnits(command: { playerId: number; unitIds: number[] }): SimUnit[] {
        return [...new Set(command.unitIds)]
            .sort((a, b) => a - b)
            .map((id) => this.units.get(id))
            .filter((u): u is SimUnit => u !== undefined && !u.dead && u.playerId === command.playerId);
    }

    /** Move and attack-move: the group is spread over a formation block around the target. */
    private executeMove(command: MoveCommand | AttackMoveCommand): void {
        const group = this.ownUnits(command);
        if (group.length === 0) return;
        const largest = Math.max(...group.map((u) => u.stats.radius));
        const targets = formationBlock(command.target, group.length, spacingFor(largest));
        group.forEach((unit, i) => giveOrder(this, unit, { type: command.type, target: targets[i] }, command.queue === true));
    }

    /** Attack a visible enemy unit; only armed units take the order. */
    private executeAttack(command: AttackCommand): void {
        const target = this.units.get(command.targetId);
        if (!target || target.dead || !this.areEnemies(command.playerId, target.playerId)) return;
        if (!this.isVisibleTo(command.playerId, target.position)) return;
        for (const unit of this.ownUnits(command)) {
            if (unit.weapons.length > 0) giveOrder(this, unit, { type: 'attack', targetId: target.id }, command.queue === true);
        }
    }

    /** Capture: the group spreads out inside the point's square. */
    private executeCapture(command: CaptureCommand): void {
        const point = this.reqPoints.get(command.pointId);
        const group = this.ownUnits(command);
        if (!point || group.length === 0) return;
        const half = idiv(metres(this.data.rules.capture.areaSize), 2) - 100;
        const largest = Math.max(...group.map((u) => u.stats.radius));
        const targets = formationBlock(point.position, group.length, spacingFor(largest)).map((t) => ({
            x: clamp(t.x, point.position.x - half, point.position.x + half),
            y: clamp(t.y, point.position.y - half, point.position.y + half),
        }));
        group.forEach((unit, i) => giveOrder(this, unit, { type: 'capture', pointId: point.id, target: targets[i] }, command.queue === true));
    }

    /** Gather: only extractors take the order. */
    private executeGather(command: GatherCommand): void {
        const reserve = this.reserves.get(command.reserveId);
        if (!reserve) return;
        for (const unit of this.ownUnits(command)) {
            if (!unit.stats.extraction) continue;
            giveOrder(this, unit, { type: 'gather', reserveId: reserve.id, phase: 'toReserve' }, command.queue === true);
        }
    }

    private executeStop(command: StopCommand): void {
        for (const unit of this.ownUnits(command)) {
            unit.orders = [];
            unit.waypoints = [];
        }
    }

    private executeHoldFire(command: HoldFireCommand): void {
        for (const unit of this.ownUnits(command)) unit.holdFire = command.holdFire;
    }

    /** Removes dead units and spent projectiles, then checks whether the match is over. */
    private cleanup(): void {
        for (const unit of [...this.units.values()]) {
            if (!unit.dead) continue;
            this.units.delete(unit.id);
            const player = this.players.get(unit.playerId);
            if (!player) continue;
            player.population -= unit.stats.population;
            if (unit.isHq) player.defeated = true;
        }
        for (const p of [...this.projectiles.values()]) if (p.dead) this.projectiles.delete(p.id);

        const alive = [...this.players.values()].filter((p) => !p.defeated);
        if (alive.length === 1 && this.players.size > 1) this.winner = alive[0].id;
    }
}

/** FNV-1a style mixing on 32-bit integers. */
function mix(h: number, value: number): number {
    return Math.imul(h ^ (value | 0), 0x01000193) >>> 0;
}
