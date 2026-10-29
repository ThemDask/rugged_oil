import type { ContentDef, FactionDef, GameRules, MapDef, UnitDef } from './types';
import { validateContent } from './validate';

/**
 * Read-only registry of all static game data, indexed by id. Built once from the content files.
 * Usage: gameData.unit('a_base'), gameData.factions().
 */
export class GameData {
    readonly rules: GameRules;
    private readonly factionMap = new Map<string, FactionDef>();
    private readonly unitMap = new Map<string, UnitDef>();
    private readonly mapMap = new Map<string, MapDef>();

    /** `files` maps a source path (for error messages) to its parsed JSON. */
    constructor(files: Record<string, ContentDef>) {
        let rules: GameRules | undefined;
        // Sorted by path so the result never depends on file system order.
        for (const path of Object.keys(files).sort()) {
            const def = files[path];
            switch (def.type) {
                case 'rules':
                    if (rules) throw new Error(`More than one rules file: ${path}`);
                    rules = def;
                    break;
                case 'faction':
                    register(this.factionMap, def, path);
                    break;
                case 'unit':
                    register(this.unitMap, def, path);
                    break;
                case 'map':
                    register(this.mapMap, def, path);
                    break;
                default:
                    throw new Error(`Unknown content type in ${path}`);
            }
        }
        if (!rules) throw new Error('No rules file found in content/.');
        this.rules = rules;
    }

    faction(id: string): FactionDef | undefined {
        return this.factionMap.get(id);
    }

    unit(id: string): UnitDef | undefined {
        return this.unitMap.get(id);
    }

    map(id: string): MapDef | undefined {
        return this.mapMap.get(id);
    }

    factions(): FactionDef[] {
        return [...this.factionMap.values()];
    }

    units(): UnitDef[] {
        return [...this.unitMap.values()];
    }

    maps(): MapDef[] {
        return [...this.mapMap.values()];
    }

    unitsOf(factionId: string): UnitDef[] {
        return this.units().filter((u) => u.faction === factionId);
    }

    /** Human-readable problems with the content (empty = valid). */
    validate(): string[] {
        return validateContent(this.rules, this.factions(), this.units(), this.maps());
    }
}

function register<T extends { id: string }>(table: Map<string, T>, def: T, path: string): void {
    if (!def.id) throw new Error(`Definition without id: ${path}`);
    if (table.has(def.id)) throw new Error(`Duplicate id '${def.id}' in ${path}`);
    table.set(def.id, def);
}
