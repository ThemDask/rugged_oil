import { unitStats, type UnitStats } from '../data/convert';
import type { GameData } from '../data/registry';
import { compareCommands, isValidCommand, type Command, type HoldFireCommand, type MoveCommand, type StopCommand } from './commands';
import { formationBlock, spacingFor } from './formation';
import { SimGrid, cellCenter, cellOf, clearanceFor } from './grid';
import { idiv, type Vec } from './math';
import { stepMovement } from './movement';
import { stepOrders } from './orders';
import { SimRng } from './rng';
import type { PlayerState, SimProjectile, SimReqPoint, SimReserve } from './state';
import { stepCapture, stepCombat, stepEconomy, stepProduction, stepProjectiles, stepVisibility } from './systems';
import { createUnit, type SimUnit } from './unit';

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

    addPlayer(id: number, faction: string, incomeBonusPercent: number): PlayerState {
        const rules = this.data.rules;
        const player: PlayerState = {
            id,
            faction,
            resources: Object.fromEntries(rules.resources.map((r) => [r, rules.startingResources[r] ?? 0])),
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

    spawnUnit(defId: string, playerId: number, at: Vec, heading = 0): SimUnit {
        const def = this.data.requireUnit(defId);
        const stats = this.unitStatsOf(defId);
        const unit = createUnit(this.nextId++, playerId, defId, def.isHq, def.sizeClass, stats, at, heading);
        this.units.set(unit.id, unit);
        const player = this.players.get(playerId);
        if (player) player.population += stats.population;
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
        stepCapture(this);
        stepVisibility(this);
        const units = [...this.units.values()];
        stepOrders(units);
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
            for (const r of this.data.rules.resources) h = mix(h, p.resources[r] ?? 0);
            for (const v of [p.id, p.population, p.queue.length, p.researched.length, p.defeated ? 1 : 0]) h = mix(h, v);
        }
        for (const u of this.units.values()) {
            for (const v of [u.id, u.playerId, u.position.x, u.position.y, u.heading, u.speedFx, u.health, u.orders.length]) h = mix(h, v);
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
                    this.executeMove(command);
                    break;
                case 'stop':
                    this.executeStop(command);
                    break;
                case 'holdFire':
                    this.executeHoldFire(command);
                    break;
                // attack, attackMove, capture, gather, recruit, cancelRecruit, research and
                // applyUpgrade are accepted but have no effect until M4-M6 implement them.
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

    private executeMove(command: MoveCommand): void {
        // Shift-queued orders arrive in M3; for now every move replaces the current orders.
        const group = this.ownUnits(command);
        if (group.length === 0) return;
        const largest = Math.max(...group.map((u) => u.stats.radius));
        const targets = formationBlock(command.target, group.length, spacingFor(largest));
        group.forEach((unit, i) => {
            unit.orders = [{ type: 'move', target: targets[i] }];
            this.planPath(unit, targets[i]);
        });
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

    private planPath(unit: SimUnit, target: Vec): void {
        unit.waypoints = [];
        const needed = clearanceFor(halfWidth(unit));
        const start = cellOf(unit.position);
        const goal = cellOf(target);
        const cells = this.grid.findPath(start, goal, needed);
        if (cells.length === 0) {
            if (start.x === goal.x && start.y === goal.y && this.grid.isPassable(goal, needed)) unit.waypoints = [{ ...target }];
            return;
        }
        unit.waypoints = this.grid.smooth(start, cells, needed).map(cellCenter);
        // Finish exactly on the target when its tile was reachable.
        const last = cells[cells.length - 1];
        if (last.x === goal.x && last.y === goal.y) unit.waypoints[unit.waypoints.length - 1] = { ...target };
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

/** Pathfinding clearance is sized by half the unit's width, so it fits gaps at least as wide as itself. */
function halfWidth(unit: SimUnit): number {
    return idiv(unit.stats.width + 1, 2);
}

/** FNV-1a style mixing on 32-bit integers. */
function mix(h: number, value: number): number {
    return Math.imul(h ^ (value | 0), 0x01000193) >>> 0;
}
