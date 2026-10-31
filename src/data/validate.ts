import { SIZE_CLASSES, type FactionDef, type GameRules, type MapDef, type MountDef, type Resources, type UnitDef, type UpgradeDef, type WeaponDef, type WeaponSlot } from './types';

/** Everything the validator looks at. */
export interface ContentSet {
    rules: GameRules;
    factions: FactionDef[];
    units: UnitDef[];
    weapons: WeaponDef[];
    mounts: MountDef[];
    upgrades: UpgradeDef[];
    maps: MapDef[];
}

/**
 * Checks static game data for broken references and nonsense values. The test suite runs it, so
 * a bad edit to any content file fails the tests with a readable message.
 */
export function validateContent(content: ContentSet): string[] {
    const { rules, factions, units, weapons, mounts, upgrades, maps } = content;
    const problems: string[] = [];
    const unitById = new Map(units.map((u) => [u.id, u]));
    const weaponIds = new Set(weapons.map((w) => w.id));
    const mountIds = new Set(mounts.map((m) => m.id));
    const factionIds = new Set(factions.map((f) => f.id));
    const upgradeById = new Map(upgrades.map((u) => [u.id, u]));

    const resources = (where: string, field: string, values: Resources | undefined) => {
        for (const [res, amount] of Object.entries(values ?? {})) {
            if (!rules.resources.includes(res)) problems.push(`${where}: ${field} uses undeclared resource '${res}'.`);
            else if (!(amount >= 0)) problems.push(`${where}: ${field} has a negative amount of '${res}'.`);
        }
    };
    const positive = (where: string, values: Record<string, number>) => {
        for (const [name, value] of Object.entries(values)) {
            if (!(value > 0)) problems.push(`${where}: ${name} must be > 0.`);
        }
    };
    const percent = (where: string, name: string, value: number) => {
        if (!(value >= 0 && value <= 100)) problems.push(`${where}: ${name} must be between 0 and 100.`);
    };
    const slot = (where: string, s: WeaponSlot) => {
        if (!weaponIds.has(s.weapon)) problems.push(`${where}: unknown weapon '${s.weapon}'.`);
        if (!mountIds.has(s.mount)) problems.push(`${where}: unknown mount '${s.mount}'.`);
    };

    // Rules
    resources('Rules', 'startingResources', rules.startingResources);
    resources('Rules', 'baseIncome', rules.baseIncome);
    resources('Rules', 'reserveAmount', rules.reserveAmount);
    positive('Rules', { populationCap: rules.populationCap, productionQueueSize: rules.productionQueueSize, ...rules.capture });
    for (const c of SIZE_CLASSES) {
        const s = rules.sizeClasses[c];
        if (!s) problems.push(`Rules: missing size class '${c}'.`);
        else positive(`Rules: size class '${c}'`, { length: s.length, width: s.width, captureWeight: s.captureWeight });
    }

    // Factions
    for (const f of factions) {
        const where = `Faction '${f.id}'`;
        checkName(problems, where, f.displayName);
        const hq = unitById.get(f.hq);
        if (!hq) problems.push(`${where}: unknown HQ '${f.hq}'.`);
        else if (!hq.isHq || hq.faction !== f.id) problems.push(`${where}: HQ '${f.hq}' must be an HQ of this faction.`);
        for (const id of f.units) {
            const u = unitById.get(id);
            if (!u) problems.push(`${where}: units references unknown id '${id}'.`);
            else if (u.faction !== f.id) problems.push(`${where}: units includes '${id}' from faction '${u.faction}'.`);
            else if (u.isHq) problems.push(`${where}: the HQ '${id}' can't be recruited.`);
        }
        for (const id of f.upgrades) {
            const u = upgradeById.get(id);
            if (!u) problems.push(`${where}: upgrades references unknown id '${id}'.`);
            else if (u.faction !== f.id) problems.push(`${where}: upgrades includes '${id}' from faction '${u.faction}'.`);
        }
    }

    // Units
    for (const u of units) {
        const where = `Unit '${u.id}'`;
        checkName(problems, where, u.displayName);
        if (!factionIds.has(u.faction)) problems.push(`${where}: unknown faction '${u.faction}'.`);
        if (!SIZE_CLASSES.includes(u.sizeClass)) problems.push(`${where}: unknown size class '${u.sizeClass}'.`);
        if (u.isHq !== (u.sizeClass === 'hq')) problems.push(`${where}: HQs and only HQs use size class 'hq'.`);
        positive(where, { health: u.health, spottingRange: u.spottingRange, topSpeed: u.topSpeed, acceleration: u.acceleration, rotationSpeed: u.rotationSpeed });
        if (!u.isHq) positive(where, { recruitTime: u.recruitTime });
        if (u.size) positive(where, { 'size.length': u.size.length, 'size.width': u.size.width });
        for (const side of ['front', 'side', 'rear'] as const) percent(where, `armour.${side}`, u.armour[side]);
        resources(where, 'cost', u.cost);
        u.weapons.forEach((s, i) => slot(`${where}, weapon ${i + 1}`, s));
        if (u.extraction) {
            resources(where, 'extraction.ratePerMinute', u.extraction.ratePerMinute);
            resources(where, 'extraction.maxLoad', u.extraction.maxLoad);
            if (u.extraction.mode === 'haul' && !u.extraction.maxLoad) problems.push(`${where}: hauling extractors need a maxLoad.`);
        }
    }

    // Weapons and mounts
    for (const w of weapons) {
        const where = `Weapon '${w.id}'`;
        checkName(problems, where, w.displayName);
        positive(where, { range: w.range, rateOfFire: w.rateOfFire, projectileSpeed: w.projectileSpeed });
        if (!(w.damage >= 0)) problems.push(`${where}: damage must be >= 0.`);
        percent(where, 'piercing', w.piercing);
        if (!(w.maxProjectileDistance >= w.range)) problems.push(`${where}: maxProjectileDistance must be at least its range.`);
    }
    for (const m of mounts) {
        const where = `Mount '${m.id}'`;
        checkName(problems, where, m.displayName);
        positive(where, { rotationSpeed: m.rotationSpeed });
        if (!(m.arc > 0 && m.arc <= 360)) problems.push(`${where}: arc must be between 1 and 360 degrees.`);
    }

    // Upgrades
    for (const up of upgrades) {
        const where = `Upgrade '${up.id}'`;
        checkName(problems, where, up.displayName);
        if (!factionIds.has(up.faction)) problems.push(`${where}: unknown faction '${up.faction}'.`);
        const target = up.appliesTo === 'faction' ? undefined : unitById.get(up.appliesTo);
        if (up.appliesTo !== 'faction' && (!target || target.faction !== up.faction)) {
            problems.push(`${where}: appliesTo must be 'faction' or a unit of faction '${up.faction}'.`);
        }
        resources(where, 'cost', up.cost);
        resources(where, 'applyCost', up.applyCost);
        positive(where, { researchTime: up.researchTime });
        if (up.apply === 'perUnit' && up.appliesTo === 'faction') problems.push(`${where}: faction-wide upgrades are always automatic.`);
        if (up.effects.length === 0) problems.push(`${where}: has no effects.`);
        for (const e of up.effects) {
            if (e.type === 'addWeapon') slot(where, e.slot);
            if (e.type === 'replaceWeapon') {
                if (!weaponIds.has(e.to)) problems.push(`${where}: unknown weapon '${e.to}'.`);
                if (target && !target.weapons.some((s) => s.weapon === e.from)) {
                    problems.push(`${where}: '${target.id}' has no weapon '${e.from}' to replace.`);
                }
            }
        }
    }

    // Maps
    for (const m of maps) {
        const where = `Map '${m.id}'`;
        checkName(problems, where, m.displayName);
        if (m.maxPlayers < 2) problems.push(`${where}: maxPlayers must be at least 2.`);
        if (m.spawns.length < m.maxPlayers) problems.push(`${where}: needs a spawn for each of its ${m.maxPlayers} players.`);
        const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < m.width && y < m.height;
        const blocked = (x: number, y: number) => m.obstacles.some((o) => x >= o.x && y >= o.y && x < o.x + o.w && y < o.y + o.h);
        const place = (what: string, p: { x: number; y: number }) => {
            if (!inside(p.x, p.y)) problems.push(`${where}: ${what} (${p.x}, ${p.y}) is outside the map.`);
            else if (blocked(p.x, p.y)) problems.push(`${where}: ${what} (${p.x}, ${p.y}) is inside an obstacle.`);
        };
        m.spawns.forEach((s) => place('spawn', s));
        m.requisitionPoints.forEach((p) => place('requisition point', p));
        for (const r of m.reserves) {
            place(`${r.resource} reserve`, r);
            if (!rules.resources.includes(r.resource)) problems.push(`${where}: reserve uses undeclared resource '${r.resource}'.`);
            else if (!(rules.reserveAmount[r.resource] > 0)) problems.push(`${where}: rules have no reserveAmount for '${r.resource}'.`);
        }
    }

    return problems;
}

function checkName(problems: string[], where: string, name: string): void {
    if (!name || name.trim() === '') problems.push(`${where}: displayName is empty.`);
}
