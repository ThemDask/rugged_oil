import type { FactionDef, GameRules, MapDef, UnitDef } from './types';

/**
 * Checks static game data for broken references and nonsense values. The test suite runs it, so
 * a bad edit to any content file fails the tests with a readable message.
 */
export function validateContent(rules: GameRules, factions: FactionDef[], units: UnitDef[], maps: MapDef[]): string[] {
    const problems: string[] = [];
    const factionIds = new Set(factions.map((f) => f.id));
    const unitById = new Map(units.map((u) => [u.id, u]));

    for (const f of factions) {
        const where = `Faction '${f.id}'`;
        checkName(problems, where, f.displayName);
        let bases = 0;
        for (const id of f.startingUnits) {
            const u = unitById.get(id);
            if (!u) problems.push(`${where}: startingUnits references unknown id '${id}'.`);
            else if (u.faction !== f.id) problems.push(`${where}: startingUnits includes '${id}' from faction '${u.faction}'.`);
            else if (u.isBase) bases++;
        }
        if (bases !== 1) problems.push(`${where}: must start with exactly one base vehicle (found ${bases}).`);
    }

    for (const u of units) {
        const where = `Unit '${u.id}'`;
        checkName(problems, where, u.displayName);
        if (!factionIds.has(u.faction)) problems.push(`${where}: unknown faction '${u.faction}'.`);
        if (u.maxHealth <= 0) problems.push(`${where}: maxHealth must be > 0.`);
        if (u.buildTime <= 0) problems.push(`${where}: buildTime must be > 0.`);
        if (u.radius <= 0 || u.moveSpeed <= 0 || u.acceleration <= 0 || u.turnRate <= 0) {
            problems.push(`${where}: radius, moveSpeed, acceleration and turnRate must be > 0.`);
        }
        for (const [res, amount] of Object.entries(u.cost)) {
            if (!rules.resourceTypes.includes(res)) problems.push(`${where}: cost uses undeclared resource '${res}'.`);
            else if (amount < 0) problems.push(`${where}: negative cost for '${res}'.`);
        }
        for (const id of u.requires) {
            if (!unitById.has(id)) problems.push(`${where}: requires unknown id '${id}'.`);
        }
        if (u.produces.length > 0 && !u.isBase) problems.push(`${where}: only base vehicles can produce units.`);
        for (const id of u.produces) {
            const produced = unitById.get(id);
            if (!produced) problems.push(`${where}: produces unknown unit '${id}'.`);
            else if (produced.faction !== u.faction) problems.push(`${where}: produces '${id}' from another faction.`);
        }
        for (const w of u.weapons) {
            if (w.damage < 0) problems.push(`${where}: weapon '${w.displayName}' has negative damage.`);
            if (w.range <= 0) problems.push(`${where}: weapon '${w.displayName}' needs range > 0.`);
            if (w.cooldown <= 0) problems.push(`${where}: weapon '${w.displayName}' needs cooldown > 0.`);
        }
    }

    for (const m of maps) {
        const where = `Map '${m.id}'`;
        checkName(problems, where, m.displayName);
        if (m.maxPlayers < 2) problems.push(`${where}: maxPlayers must be at least 2.`);
        if (m.spawns.length < m.maxPlayers) problems.push(`${where}: needs a spawn for each of its ${m.maxPlayers} players.`);
        const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < m.width && y < m.height;
        for (const s of m.spawns) {
            if (!inside(s.x, s.y)) problems.push(`${where}: spawn (${s.x}, ${s.y}) is outside the map.`);
            if (m.obstacles.some((o) => s.x >= o.x && s.y >= o.y && s.x < o.x + o.w && s.y < o.y + o.h)) {
                problems.push(`${where}: spawn (${s.x}, ${s.y}) is inside an obstacle.`);
            }
        }
    }

    return problems;
}

function checkName(problems: string[], where: string, name: string): void {
    if (!name || name.trim() === '') problems.push(`${where}: displayName is empty.`);
}
