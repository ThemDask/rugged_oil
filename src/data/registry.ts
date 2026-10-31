import type { ContentDef, FactionDef, GameRules, MapDef, MountDef, UnitDef, UpgradeDef, WeaponDef } from './types';
import { validateContent } from './validate';

/**
 * Read-only registry of all static game data, indexed by id. Built once from the content files.
 * Usage: gameData.unit('league_knight'), gameData.factions().
 */
export class GameData {
    readonly rules: GameRules;
    private readonly factionMap = new Map<string, FactionDef>();
    private readonly unitMap = new Map<string, UnitDef>();
    private readonly weaponMap = new Map<string, WeaponDef>();
    private readonly mountMap = new Map<string, MountDef>();
    private readonly upgradeMap = new Map<string, UpgradeDef>();
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
                case 'weapon':
                    register(this.weaponMap, def, path);
                    break;
                case 'mount':
                    register(this.mountMap, def, path);
                    break;
                case 'upgrade':
                    register(this.upgradeMap, def, path);
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

    weapon(id: string): WeaponDef | undefined {
        return this.weaponMap.get(id);
    }

    mount(id: string): MountDef | undefined {
        return this.mountMap.get(id);
    }

    upgrade(id: string): UpgradeDef | undefined {
        return this.upgradeMap.get(id);
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

    weapons(): WeaponDef[] {
        return [...this.weaponMap.values()];
    }

    mounts(): MountDef[] {
        return [...this.mountMap.values()];
    }

    upgrades(): UpgradeDef[] {
        return [...this.upgradeMap.values()];
    }

    maps(): MapDef[] {
        return [...this.mapMap.values()];
    }

    /** Like unit(), but throws for an unknown id. For code that runs after validation. */
    requireUnit(id: string): UnitDef {
        return required(this.unitMap, id, 'unit');
    }

    requireWeapon(id: string): WeaponDef {
        return required(this.weaponMap, id, 'weapon');
    }

    requireMount(id: string): MountDef {
        return required(this.mountMap, id, 'mount');
    }

    /** Human-readable problems with the content (empty = valid). */
    validate(): string[] {
        return validateContent({
            rules: this.rules,
            factions: this.factions(),
            units: this.units(),
            weapons: this.weapons(),
            mounts: this.mounts(),
            upgrades: this.upgrades(),
            maps: this.maps(),
        });
    }
}

function register<T extends { id: string }>(table: Map<string, T>, def: T, path: string): void {
    if (!def.id) throw new Error(`Definition without id: ${path}`);
    if (table.has(def.id)) throw new Error(`Duplicate id '${def.id}' in ${path}`);
    table.set(def.id, def);
}

function required<T>(table: Map<string, T>, id: string, kind: string): T {
    const def = table.get(id);
    if (!def) throw new Error(`Unknown ${kind} '${id}'`);
    return def;
}
