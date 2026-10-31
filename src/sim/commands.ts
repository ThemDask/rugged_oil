import type { Vec } from './math';

/**
 * Commands: every game-state change is one. Player input and AI both produce them, the
 * simulation validates and applies them at a tick, and later the network sends them (lockstep).
 * They're plain data so they can be logged, replayed and serialized as JSON.
 */

interface CommandBase {
    /** Index of the issuing player in MatchConfig.players. */
    playerId: number;
    /** Tick the command is applied on. Assigned when scheduled. */
    tick?: number;
    /** Tie-breaker for commands on the same tick. Assigned when scheduled. */
    sequence?: number;
}

/** Orders for a group of units. `queue` (Shift) appends instead of replacing the current order. */
interface OrderBase extends CommandBase {
    unitIds: number[];
    queue?: boolean;
}

/** Drive to a point (sim units). A group is spread around the target. */
export interface MoveCommand extends OrderBase {
    type: 'move';
    target: Vec;
}

/** Attack one enemy unit, driving into range if needed. */
export interface AttackCommand extends OrderBase {
    type: 'attack';
    targetId: number;
}

/** Drive to a point, stopping to fight visible enemies in range. */
export interface AttackMoveCommand extends OrderBase {
    type: 'attackMove';
    target: Vec;
}

/** Capture a requisition point. */
export interface CaptureCommand extends OrderBase {
    type: 'capture';
    pointId: number;
}

/** Extract from a reserve. */
export interface GatherCommand extends OrderBase {
    type: 'gather';
    reserveId: number;
}

/** Cancel current and queued orders; the units stay in place. */
export interface StopCommand extends CommandBase {
    type: 'stop';
    unitIds: number[];
}

/** Turn automatic firing off (holdFire: true) or back on. */
export interface HoldFireCommand extends CommandBase {
    type: 'holdFire';
    unitIds: number[];
    holdFire: boolean;
}

/** Queue a unit at the player's HQ. Paid immediately. */
export interface RecruitCommand extends CommandBase {
    type: 'recruit';
    unitDefId: string;
}

/** Remove a queued unit (index in the queue) with a full refund. */
export interface CancelRecruitCommand extends CommandBase {
    type: 'cancelRecruit';
    index: number;
}

/** Research an upgrade at the HQ. */
export interface ResearchCommand extends CommandBase {
    type: 'research';
    upgradeId: string;
}

/** Apply a researched per-unit upgrade to some units, paying its apply cost per unit. */
export interface ApplyUpgradeCommand extends CommandBase {
    type: 'applyUpgrade';
    upgradeId: string;
    unitIds: number[];
}

export type Command =
    | MoveCommand
    | AttackCommand
    | AttackMoveCommand
    | CaptureCommand
    | GatherCommand
    | StopCommand
    | HoldFireCommand
    | RecruitCommand
    | CancelRecruitCommand
    | ResearchCommand
    | ApplyUpgradeCommand;

const isId = (v: unknown): boolean => Number.isInteger(v) && (v as number) >= 0;
const isIdList = (v: unknown): boolean => Array.isArray(v) && v.length > 0 && v.every(isId);
const isPoint = (v: Vec | undefined): boolean => v !== undefined && Number.isInteger(v.x) && Number.isInteger(v.y);
const isText = (v: unknown): boolean => typeof v === 'string' && v.length > 0;

/** Shape checks that need no game state. Ownership, costs and targets are checked by the simulation. */
export function isValidCommand(command: Command): boolean {
    if (!isId(command.playerId)) return false;
    switch (command.type) {
        case 'move':
        case 'attackMove':
            return isIdList(command.unitIds) && isPoint(command.target);
        case 'attack':
            return isIdList(command.unitIds) && isId(command.targetId);
        case 'capture':
            return isIdList(command.unitIds) && isId(command.pointId);
        case 'gather':
            return isIdList(command.unitIds) && isId(command.reserveId);
        case 'stop':
            return isIdList(command.unitIds);
        case 'holdFire':
            return isIdList(command.unitIds) && typeof command.holdFire === 'boolean';
        case 'recruit':
            return isText(command.unitDefId);
        case 'cancelRecruit':
            return isId(command.index);
        case 'research':
            return isText(command.upgradeId);
        case 'applyUpgrade':
            return isText(command.upgradeId) && isIdList(command.unitIds);
        default:
            return false;
    }
}

/** Order commands are applied in: tick, then player, then sequence. */
export function compareCommands(a: Command, b: Command): number {
    return (a.tick ?? 0) - (b.tick ?? 0) || a.playerId - b.playerId || (a.sequence ?? 0) - (b.sequence ?? 0);
}
