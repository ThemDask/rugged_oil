# Architecture

## Goals

- **Content-driven:** adding or rebalancing a unit means editing data, not code.
- **Testable:** game rules run headlessly in the test suite.
- **Fair, replaceable AI:** the AI plays through the same interface as the human.
- **Doors left open:** replays, save/load and multiplayer shouldn't need a rewrite later.

## Layers

```
            ┌──────────────────────── ui/ ────────────────────────┐
            │ main menu · match setup · HUD · minimap             │
            └──────────┬──────────────────────────▲───────────────┘
        builds         │ MatchConfig              │ EventBus signals / reads state
                       ▼                          │
  player input ─► Command ◄─ ai/          ┌───────┴────────┐
                     │                    │    match/      │  loads config, spawns,
                     ▼                    │                │  checks win conditions
            ┌────────────── systems/ ─────┴────────────────┐
            │ orders · production · economy · combat · fog │
            └──────────┬────────────────────────▲──────────┘
                       ▼                        │
            entities/ (unit, building nodes) ───┘
                       │ read stats from
                       ▼
     autoload/GameData ◄── content/*.tres  (typed by core/defs/*)
```

### `core/`: types and pure rules
Resource classes for static data (`core/defs`), match setup types (`core/setup`) and the `Command`
base class. No dependency on the scene tree or autoloads. Everything here is unit-testable.

### `content/`: data
`.tres` instances of the `core/defs` classes. `GameData` scans this folder recursively at startup
and indexes every definition by `id`. See `data.md`.

### `entities/`: things in the world
One scene per unit or building *archetype* (e.g. `unit.tscn`), configured at spawn time with a
`UnitDef`. Only distinct visuals and behaviours get their own scene, and a def's `scene` field
can override the default. Entities own movement, animation and hit detection. They don't decide
strategy.

### `systems/`: gameplay rules across entities
Selection, order execution, production queues, resource bookkeeping, damage resolution, fog of
war. Each system is a node under the match scene, or a plain class it owns. Where possible, the
logic lives in plain classes so tests can drive it.

### `ai/`: computer players
One AI controller per AI `PlayerSlot`. It reads the visible game state and **emits `Command`s**.
It has no special access, so difficulty comes from decision quality (plus optional,
explicit resource bonuses).

### `match/`: orchestration
Takes a `MatchConfig`, loads the map, spawns each player's starting units and buildings from
their `FactionDef`, starts the AI controllers and checks win conditions.

### `ui/`
Menus and HUD. The setup screen produces a `MatchConfig`. The HUD reads state and listens to
`EventBus`. UI never mutates game state directly: it issues Commands.

## Commands

Every state-changing action is a `Command` subclass (`MoveCommand`, `AttackCommand`,
`BuildCommand`, `TrainCommand`, ...) carrying `player_id`, target data, and the `tick` it's
applied on. This gives us:

- one code path for human and AI;
- an action log, which together with the `MatchConfig` and random seed makes a **replay**;
- a natural unit to send over the network if multiplayer ever happens (lockstep needs
  determinism, which we aren't promising yet, but this keeps it reachable).

## Autoloads

| Name | Purpose |
|---|---|
| `EventBus` | Coarse global signals (match started/ended, entity spawned/destroyed, command issued). |
| `GameData` | Read-only registry of all content definitions, plus `validate()`. |

Keep the autoload list short. Match-specific state belongs to the match scene, not a singleton,
so it's discarded cleanly between matches.

## Persistence

| Data | Where | Format |
|---|---|---|
| Static game data | `res://content` | `.tres` Resources (see `data.md`) |
| Player settings | `user://settings.cfg` | `ConfigFile` |
| Last match setup | `user://last_match.tres` | `MatchConfig` resource |
| Replays (later) | `user://replays/` | `MatchConfig` + command log |

## Testing

`game/tests/run_tests.gd` is a small built-in runner (no plugins), run headlessly by
`tools/run_tests.ps1`. It discovers `test_*.gd` files and treats script errors raised during a test
as failures. If testing needs grow (mocking, scene runners), GUT or gdUnit4 can replace it without
changing the folder structure.
