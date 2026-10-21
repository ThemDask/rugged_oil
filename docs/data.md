# Game data

## Where data lives

All static game data is stored as **Godot custom Resources (`.tres`)** under `game/content/`. The
classes that define their shape are in `game/core/defs/`. See
`decisions/0002-game-data-as-resources.md` for why this beats JSON or a database here.

```
content/
  rules.tres                    GameRules: resource types, starting resources, supply cap
  factions/
    faction_a/
      faction.tres              FactionDef
      units/*.tres              UnitDef (weapons embedded as WeaponDef sub-resources)
      buildings/*.tres          BuildingDef
    faction_b/ ...
  maps/                         (later) MapDef + map scene per map
```

Folder placement is for humans. `GameData` scans `content/` recursively and classifies each file by
its class, so files can be moved around freely.

## Definition types

| Class | Key fields |
|---|---|
| `GameRules` | `resource_types`, `starting_resources`, `supply_cap` |
| `FactionDef` | `id`, `display_name`, `color`, `starting_units`, `starting_buildings` |
| `EntityDef` (base) | `id`, `faction`, `display_name`, `cost`, `build_time`, `max_health`, `armor`, `sight_range`, `requires`, `tags`, `weapons`, `scene`, `icon` |
| `UnitDef` | + `move_speed`, `supply` |
| `BuildingDef` | + `footprint`, `produces`, `provides_supply`, `is_dropoff` |
| `WeaponDef` | `damage`, `range`, `cooldown`, `splash_radius`, `bonus_vs_tags` |

## Rules

- `id`s are globally unique, `lower_snake_case`, prefixed per faction: `a_worker`, `b_barracks`.
- Cross-references (`faction`, `requires`, `produces`, `starting_units`) use ids, never paths.
- `cost` keys must be listed in `GameRules.resource_types`.
- `ContentValidator` (run by the test suite) enforces all of the above, plus sane values.

## Adding a unit

1. Create `content/factions/<faction>/units/<name>.tres` with the `UnitDef` script, either in the
   Godot inspector (*New Resource → UnitDef*) or by copying an existing file.
2. Give it a unique `id` and its `faction`. Add its id to some building's `produces` list.
3. Run `./tools/run_tests.ps1`.

## Balancing in bulk (later)

If editing stats one file at a time gets tedious, add a `tools/` script that exports all defs
to CSV for spreadsheet editing and imports them back. The `.tres` files stay the source of
truth.

## Runtime/player data

Not stored in `content/`. Settings use `ConfigFile` at `user://settings.cfg`, and match setups and
replays go to `user://` (see `architecture.md`, Persistence).
