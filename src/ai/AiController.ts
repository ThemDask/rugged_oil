import type { Command } from '../sim/commands';
import type { SimWorld } from '../sim/world';

/**
 * A computer opponent for one player. It reads simulation state and returns Commands, exactly
 * like a human's input; it has no other access. Placeholder: it does nothing yet (M6).
 *
 * For lockstep multiplayer the AI must either be deterministic (use world.rng only, decide on
 * tick boundaries) or run on one machine and send its commands like a player.
 */
export class AiController {
    constructor(readonly playerId: number) {}

    /** Called once per tick before the simulation steps. */
    think(_world: SimWorld): Command[] {
        return [];
    }
}
