/** What the match setup screen produces: everything needed to start a skirmish. */

export type Controller = 'human' | 'ai';
export type AiDifficulty = 'easy' | 'normal' | 'hard';

export interface PlayerSlot {
    controller: Controller;
    faction: string;
    /** Players with the same team number are allies. */
    team: number;
    /** Player color, e.g. "#4080ff". */
    color: string;
    aiDifficulty?: AiDifficulty;
}

export interface MatchConfig {
    mapId: string;
    players: PlayerSlot[];
    /** Seeds the simulation's RNG. Recorded so a match (or replay) can be reproduced exactly. */
    seed: number;
}

/** Problems that make the match unplayable (empty = valid). */
export function validateMatchConfig(config: MatchConfig, knownFactions: string[], knownMaps: string[]): string[] {
    const problems: string[] = [];
    if (!knownMaps.includes(config.mapId)) problems.push(`Unknown map '${config.mapId}'.`);
    if (config.players.length < 2) problems.push('A match needs at least 2 players.');
    config.players.forEach((p, i) => {
        if (!knownFactions.includes(p.faction)) problems.push(`Player ${i} has unknown faction '${p.faction}'.`);
    });
    const humans = config.players.filter((p) => p.controller === 'human').length;
    if (humans !== 1) problems.push(`Exactly one human player is supported (found ${humans}).`);
    if (config.players.length >= 2 && new Set(config.players.map((p) => p.team)).size < 2) {
        problems.push('All players are on the same team.');
    }
    if (!Number.isInteger(config.seed)) problems.push('Seed must be an integer.');
    return problems;
}

export const PLAYER_COLORS = ['#4080ff', '#e04030', '#40c060', '#e0c030'];

/** A 1v1 vs AI: the human plays `faction`, the AI the same faction (the only one for now). */
export function createSkirmish(mapId: string, faction: string, aiFaction: string, seed: number): MatchConfig {
    return {
        mapId,
        seed,
        players: [
            { controller: 'human', faction, team: 0, color: PLAYER_COLORS[0] },
            { controller: 'ai', faction: aiFaction, team: 1, color: PLAYER_COLORS[1], aiDifficulty: 'normal' },
        ],
    };
}
