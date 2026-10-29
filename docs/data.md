# Game data

## Where data lives

All static game data is JSON under `content/`. Its shape is defined by TypeScript types in
`src/data/types.ts`, and it's checked by `src/data/validate.ts` (run by the test suite and logged
at startup). Vite bundles every `content/**/*.json` file into the game at build time
(`src/data/content.ts`). See `decisions/0002-game-data-as-resources.md` and
`decisions/0006-phaser-typescript.md` for why plain text data and not a database.

```
content/
  rules.json                      GameRules: resource types (workforce, fuel, metal),
                                  starting resources, supply cap
  factions/
    faction_a/
      faction.json                FactionDef
      units/*.json                UnitDef (weapons inline)
    (second faction later, same structure)
  maps/<map>/map.json             MapDef: size, obstacles, spawns (background image later)
```

Every file has a `"type"` field (`rules`, `faction`, `unit` or `map`), so folder placement is for
humans only. The registry classifies files by `type`.

## Definition types

| Type | Key fields |
|---|---|
| `rules` | `resourceTypes`, `startingResources`, `supplyCap` |
| `faction` | `id`, `displayName`, `color`, `startingUnits` (exactly one base vehicle) |
| `unit` | `id`, `faction`, `displayName`, `tags`, `cost`, `buildTime`, `requires`, `maxHealth`, `armor`, `sightRange`, `weapons`, `isBase`, `produces`, `moveSpeed`, `acceleration`, `turnRate`, `radius`, `supply` |
| weapon (inline in a unit) | `displayName`, `damage`, `range`, `cooldown`, optional `splashRadius`, `projectileSpeed`, `bonusVsTags` |
| `map` | `id`, `displayName`, `maxPlayers`, `width`, `height`, `groundColor`, optional `background`, `obstacles`, `spawns` |

## Units of measure

Data is written in **tiles and seconds**, never pixels:
- distances (`sightRange`, `radius`, weapon `range`, `splashRadius`, map sizes, obstacle and spawn
  coordinates) in **tiles**;
- `moveSpeed` and `projectileSpeed` in tiles per second, `acceleration` in tiles per second per
  second;
- `turnRate` in **degrees per second**;
- `buildTime` and `cooldown` in seconds.

The simulation converts these to integer sim units (1 tile = 1000) once, when a unit spawns. The
view draws 1 tile as 32 px.

## Rules

- `id`s are globally unique, lower_snake_case, prefixed per faction: `a_base`, `a_buggy`.
- Cross-references (`faction`, `requires`, `produces`, `startingUnits`) use ids.
- `cost` keys must be listed in `rules.resourceTypes`.
- Every faction starts with exactly one base vehicle (`isBase: true`). Only base vehicles may
  `produce`.
- Map spawns must be inside the map and not inside an obstacle, one per player.

## Adding a unit

1. Copy a file in `content/factions/<faction>/units/`, give it a new `id`.
2. Add its id to the base vehicle's `produces` list.
3. Run `npm test`.

## Making a map

1. Create `content/maps/<map_id>/map.json` (copy `test_map`).
2. Set `width`/`height` in tiles, add `obstacles` as tile rectangles `{x, y, w, h}` and one
   `spawn` per player.
3. Optional background image: put it in `public/assets/`, load it in `BootScene.preload()` under
   a key, and set `"background": "<key>"`. It is stretched over the whole map.
4. Run `npm test`.

## Runtime/player data

Not in `content/`. Settings are stored in `localStorage`; replays later (see `architecture.md`).
