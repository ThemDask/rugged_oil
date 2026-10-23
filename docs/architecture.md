# Architecture

## Goals

- **Deterministic, lockstep-ready:** the same commands always produce the same game, on every
  machine. Multiplayer (later) exchanges only Commands. See `decisions/0005-deterministic-lockstep.md`.
- **Content-driven:** adding or rebalancing a unit means editing data, not code.
- **Testable:** game rules run headlessly in the test suite.
- **Fair, replaceable AI:** the AI plays through the same interface as the human.

## Layers

```
   player input (ui/, systems/selection)        ai/        network relay (later)
                 │                                │                 │
                 └──────────────► Command ◄───────┴─────────────────┘
                                     │  scheduled for tick T
                                     ▼
┌──────────────────────────── Simulation (core/sim/) ─────────────────────────────┐
│ fixed tick · integer maths · seeded RNG · entities processed in id order        │
│ owns ALL game state: units, buildings, resources, fuel, production, combat      │
│ tile grid + A* pathfinding · deterministic separation · per-tick checksum       │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ read-only (+ coarse events)
                                       ▼
┌────────────────────── View: Godot Nodes ──────────────────────┐
│ entities/ draw sim entities, interpolating between ticks      │
│ ui/ HUD and menus · camera · effects · audio                  │
└────────────────────────────────────────────────────────────────┘
        stats come from:  autoload/GameData ◄── content/*.tres (typed by core/defs/*)
```

### `core/sim/`: the simulation (all game state)
Plain GDScript classes (`RefCounted`), no Nodes and no engine physics or navigation. It advances
in fixed ticks (target 20/s), applies the Commands scheduled for each tick, then runs its systems
in a fixed order. It uses integer sim units (1 tile = 1000) and one seeded RNG. It can produce a
checksum of its full state. A whole match can run headlessly, and that's how we test determinism.

### `core/`: types and pure rules
Resource classes for static data (`core/defs`), match setup types (`core/setup`), Commands
(`core/commands`) and helpers. No dependency on the scene tree.

### `content/`: data
`.tres` instances of the `core/defs` classes. `GameData` scans this folder recursively at startup
and indexes every definition by `id`. See `data.md`.

### `entities/`: views of sim entities
One scene per unit or building archetype. Each view follows one sim entity by id: it reads its
position, facing and health, interpolates between the last two ticks, and draws a placeholder.
**Views never change game state.**

### `systems/`: Node-side systems
Things that need the engine: `camera`, `selection` (turns mouse input into Commands) and the
bridge that feeds Commands into the simulation (`commands`). Gameplay rules such as economy,
production and combat live inside `core/sim/` as simulation systems, not here.

### `ai/`: computer players
One AI controller per AI `PlayerSlot`. It reads simulation state and **emits Commands**. For
lockstep, the AI must itself be deterministic (sim RNG only, decisions on tick boundaries) or run
on one machine only and send its Commands like a player. To be decided before multiplayer.

### `match/`: orchestration
Takes a `MatchConfig`, creates the simulation (map grid, players, starting HQ and units), drives
its tick loop from `_physics_process`, spawns and removes views, and reports win or loss.

### `ui/`
`menus/` (full screens: main menu, match setup), `dialogs/` (modals: settings, pause),
`hud/` (in-match overlay), `widgets/` (shared pieces). UI never changes game state directly:
it issues Commands.

## Scene flow

```
ui/menus/main_menu.tscn ──► ui/menus/match_setup.tscn ──► match/game_match.tscn
        ▲                     (builds a MatchConfig,          │
        │                      sets GameMatch.pending_config) │ Esc: ui/dialogs/pause_menu
        └────────────────── Exit (change_scene) ◄─────────────┘
```

Screens are switched with `get_tree().change_scene_to_file()`. The match scene is self-contained,
so leaving it frees all match state. Modals (settings, pause) are scenes under `ui/dialogs/` and
are instanced on top of the current screen.

## Commands and ticks

Every state-changing action is a `Command` (`MoveCommand`, `AttackCommand`, `BuildCommand`,
`TrainCommand`, ...) carrying `player_id`, its data, and the `tick` it executes on.

- Commands are **orders** (one per player decision), not per-frame state changes.
- **Single-player:** local Commands are scheduled for the next tick.
- **Multiplayer (later):** Commands are batched per **turn** (e.g. 150 ms, several ticks),
  exchanged through a relay server with a 2-turn input delay, and applied by every client in
  the same order (tick, player id, sequence). State checksums detect desyncs.
- The simulation **validates every Command** (ownership, costs, requirements). Invalid Commands
  are dropped identically on every machine.
- A command log plus `MatchConfig` (with seed) is a **replay**.

## Determinism rules (simulation code)

1. No floats in simulation state or rule maths. Integers only, sim units of 1/1000 tile.
2. No engine physics, navigation, timers or `randf()` in the simulation. Use the sim RNG.
3. Iterate entities in ascending id. Never depend on Node order or frame timing.
4. Everything the simulation needs comes from Commands, `MatchConfig` and content data.
5. Every change to simulation rules keeps the determinism test passing.

## Autoloads

| Name | Purpose |
|---|---|
| `EventBus` | Coarse global signals (match started/ended, entity spawned/destroyed, command issued). |
| `GameData` | Read-only registry of all content definitions, plus `validate()`. |
| `Settings` *(M2)* | Player settings (audio, video, input). Loads and saves `user://settings.cfg` and applies them. |

Keep the autoload list short. Match-specific state belongs to the simulation and the match scene.

## Persistence

| Data | Where | Format |
|---|---|---|
| Static game data | `res://content` | `.tres` Resources (see `data.md`) |
| Player settings | `user://settings.cfg` | `ConfigFile` |
| Last match setup | `user://last_match.tres` | `MatchConfig` resource |
| Replays (later) | `user://replays/` | `MatchConfig` + command log |

## Testing

`game/tests/run_tests.gd` is a small built-in runner (no plugins), run headlessly by
`tools/run_tests.ps1`. It discovers `test_*.gd` files and treats script errors during a test as
failures. Beyond unit tests, the key test is the **determinism test**: run a match twice from
the same seed and commands, and assert identical checksums at every tick.
