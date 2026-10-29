import type { GameData } from '../data/registry';
import type { MapDef } from '../data/types';
import type { MatchConfig } from '../setup/matchConfig';
import { formationBlock, spacingFor } from './formation';
import { SimGrid, cellCenter } from './grid';
import { UNITS_PER_TILE, atan2Steps } from './math';
import { SimWorld } from './world';

/** The simulation's tile grid for a map: every obstacle tile is blocked. */
export function createGrid(map: MapDef): SimGrid {
    const grid = new SimGrid(map.width, map.height);
    for (const o of map.obstacles) grid.blockRect(o);
    grid.updateClearance();
    return grid;
}

/**
 * Builds the starting state of a match: the map grid and each player's starting units at their
 * spawn, facing the map center. Deterministic: the same config and data give the same world.
 */
export function createWorld(config: MatchConfig, data: GameData): SimWorld {
    const map = data.map(config.mapId);
    if (!map) throw new Error(`Unknown map '${config.mapId}'`);
    if (map.spawns.length < config.players.length) throw new Error(`Map '${map.id}' has too few spawns`);

    const world = new SimWorld(createGrid(map), config.seed);
    const center = { x: map.width * (UNITS_PER_TILE / 2), y: map.height * (UNITS_PER_TILE / 2) };

    config.players.forEach((slot, playerId) => {
        const faction = data.faction(slot.faction);
        if (!faction) throw new Error(`Unknown faction '${slot.faction}'`);
        const spawn = cellCenter(map.spawns[playerId]);
        const defs = faction.startingUnits.map((id) => {
            const def = data.unit(id);
            if (!def) throw new Error(`Unknown unit '${id}'`);
            return def;
        });
        const largest = Math.max(...defs.map((d) => Math.round(d.radius * UNITS_PER_TILE)));
        const points = formationBlock(spawn, defs.length, spacingFor(largest));
        const heading = atan2Steps(center.y - spawn.y, center.x - spawn.x);
        defs.forEach((def, i) => world.spawnUnit(def, playerId, points[i], heading));
    });
    return world;
}
