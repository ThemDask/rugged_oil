import type { UnitDef } from '../data/types';
import { compareCommands, isValidCommand, type Command, type MoveCommand } from './commands';
import { formationBlock, spacingFor } from './formation';
import { SimGrid, cellCenter, cellOf, clearanceFor } from './grid';
import type { Vec } from './math';
import { stepMovement } from './movement';
import { SimRng } from './rng';
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
    /** The only source of randomness for gameplay. */
    readonly rng: SimRng;
    /** By id. Ids only increase and Maps keep insertion order, so iteration is by ascending id. */
    readonly units = new Map<number, SimUnit>();

    private nextId = 1;
    private nextSequence = 0;
    private pending: Command[] = [];

    constructor(grid: SimGrid, seed: number) {
        this.grid = grid;
        this.rng = new SimRng(seed);
    }

    spawnUnit(def: UnitDef, playerId: number, at: Vec, heading = 0): SimUnit {
        const unit = createUnit(def, this.nextId++, playerId, at, heading);
        this.units.set(unit.id, unit);
        return unit;
    }

    /** Queues a Command for the next tick (or for command.tick if that's later). */
    schedule(command: Command): void {
        command.tick = Math.max(command.tick ?? 0, this.tick + 1);
        command.sequence = this.nextSequence++;
        this.pending.push(command);
    }

    /** Advances the simulation by one tick. */
    step(): void {
        this.tick += 1;
        for (const unit of this.units.values()) {
            unit.previousPosition = { ...unit.position };
            unit.previousHeading = unit.heading;
        }
        this.applyCommands();
        stepMovement([...this.units.values()], this.grid);
    }

    /** Hash of the full simulation state. Equal on every machine while the simulations agree. */
    checksum(): number {
        let h = mix(0x811c9dc5, this.tick);
        h = mix(h, this.rng.getState());
        for (const u of this.units.values()) {
            for (const v of [u.id, u.playerId, u.position.x, u.position.y, u.heading, u.speed, u.health]) h = mix(h, v);
        }
        return h;
    }

    private applyCommands(): void {
        const due = this.pending.filter((c) => (c.tick ?? 0) <= this.tick).sort(compareCommands);
        this.pending = this.pending.filter((c) => (c.tick ?? 0) > this.tick);
        for (const command of due) {
            if (!isValidCommand(command)) continue;
            switch (command.type) {
                case 'move':
                    this.executeMove(command);
                    break;
            }
        }
    }

    private executeMove(command: MoveCommand): void {
        const ids = [...new Set(command.unitIds)].sort((a, b) => a - b);
        const group = ids.map((id) => this.units.get(id)).filter((u): u is SimUnit => u !== undefined && u.playerId === command.playerId);
        if (group.length === 0) return;
        const largest = Math.max(...group.map((u) => u.radius));
        const targets = formationBlock(command.target, group.length, spacingFor(largest));
        group.forEach((unit, i) => this.planPath(unit, targets[i]));
    }

    private planPath(unit: SimUnit, target: Vec): void {
        unit.waypoints = [];
        const needed = clearanceFor(unit.radius);
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
}

/** FNV-1a style mixing on 32-bit integers. */
function mix(h: number, value: number): number {
    return Math.imul(h ^ (value | 0), 0x01000193) >>> 0;
}
