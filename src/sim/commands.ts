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

/** Move units to a target (sim units). A group is spread around the target. */
export interface MoveCommand extends CommandBase {
    type: 'move';
    unitIds: number[];
    target: Vec;
}

export type Command = MoveCommand;

/** Basic checks that need no game state. Ownership is checked by the simulation. */
export function isValidCommand(command: Command): boolean {
    if (!Number.isInteger(command.playerId) || command.playerId < 0) return false;
    switch (command.type) {
        case 'move':
            return (
                command.unitIds.length > 0 &&
                command.unitIds.every(Number.isInteger) &&
                Number.isInteger(command.target.x) &&
                Number.isInteger(command.target.y)
            );
    }
}

/** Order commands are applied in: tick, then player, then sequence. */
export function compareCommands(a: Command, b: Command): number {
    return (a.tick ?? 0) - (b.tick ?? 0) || a.playerId - b.playerId || (a.sequence ?? 0) - (b.sequence ?? 0);
}
