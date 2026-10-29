import type { Command } from '../../sim/commands';
import type { SimWorld } from '../../sim/world';

/**
 * The one path from local input (and AI) into the simulation. Single-player schedules commands
 * for the next tick. Multiplayer will replace this with sending them to the relay and scheduling
 * them once every player's commands for that turn have arrived.
 */
export class CommandBridge {
    constructor(private readonly world: SimWorld) {}

    issue(command: Command): void {
        this.world.schedule(command);
    }
}
