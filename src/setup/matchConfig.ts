/** What the match setup screen produces: everything needed to start a skirmish. */

export type Controller = 'human' | 'ai';

export interface PlayerSlot {
    controller: Controller;
    faction: string;
    /** Players with the same team number are allies. */
    team: number;
    /** Player colour, e.g. "#4080ff". */
    color: string;
    /** Extra percent on all resource income (the AI's cheat; 0 for humans). */
    incomeBonusPercent: number;
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
        if (!Number.isInteger(p.incomeBonusPercent) || p.incomeBonusPercent < 0) problems.push(`Player ${i} has an invalid income bonus.`);
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

/** A 1v1 vs AI: the human plays `faction`, the AI plays `enemyFaction` with its income bonus. */
export function createSkirmish(mapId: string, faction: string, enemyFaction: string, seed: number, aiIncomeBonusPercent: number): MatchConfig {
    return {
        mapId,
        seed,
        players: [
            { controller: 'human', faction, team: 0, color: PLAYER_COLORS[0], incomeBonusPercent: 0 },
            { controller: 'ai', faction: enemyFaction, team: 1, color: PLAYER_COLORS[1], incomeBonusPercent: aiIncomeBonusPercent },
        ],
    };
}
