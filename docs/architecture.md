# Architecture

Phaser 3 + TypeScript, bundled with Vite, tested with Vitest. See
`decisions/0006-phaser-typescript.md` (engine) and `decisions/0005-deterministic-lockstep.md`
(simulation).

## Goals

- **Deterministic, lockstep-ready:** the same commands always produce the same game, on every
  machine. Multiplayer (later) exchanges only Commands.
- **Content-driven:** adding or rebalancing a unit means editing JSON, not code.
- **Testable:** all game rules run in plain Node, with no engine.
- **Fair, replaceable AI:** the AI plays through the same Commands as the human.

## Layers

```
   mouse/keyboard (client/systems/Selection)      ai/AiController      network relay (later)
                 │                                       │                     │
                 └────────────────► Command ◄────────────┴─────────────────────┘
                                      │  client/systems/CommandBridge → world.schedule()
                                      ▼
┌──────────────────────────── src/sim/  (SimWorld) ───────────────────────────────┐
│ fixed tick (20/s) · integer maths · seeded RNG · units processed in id order    │
│ owns ALL game state · grid + A* · vehicle movement · checksum                   │
│ never imports Phaser or anything from src/client                                │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ read-only
                                       ▼
┌──────────────────────── src/client/  (Phaser) ─────────────────────────┐
│ scenes · views (UnitView, MapView) interpolate between ticks · camera  │
│ input → Commands · HUD and menus · settings                            │
└─────────────────────────────────────────────────────────────────────────┘
        stats come from: src/data/GameData ◄── content/**/*.json (typed by src/data/types.ts)
```

## Folders

| Folder | Role | May import Phaser? |
|---|---|---|
| `src/sim/` | The simulation: all game state, deterministic. `world.ts` (tick, commands, checksum), `grid.ts` (tiles, clearance, A*), `movement.ts`, `unit.ts`, `formation.ts`, `rng.ts`, `math.ts`, `commands.ts`, `setup.ts` (builds a world from a MatchConfig). | **No** |
| `src/data/` | Content types, the `GameData` registry, the content validator. `content.ts` bundles `content/**/*.json` via `import.meta.glob`. | **No** |
| `src/setup/` | `MatchConfig` / `PlayerSlot`, the output of the match setup screen. | **No** |
| `src/ai/` | Computer opponents. They read the sim and return Commands. | **No** |
| `src/client/` | Everything Phaser: `main.ts`, `scenes/`, `views/`, `systems/` (camera, selection, command bridge), `ui/` (buttons, modals, settings, pause menu, debug overlay), `settings.ts`, `scale.ts` (pixels per tile, sim↔pixel conversion). | Yes |
| `content/` | Game data as JSON (see `data.md`). | n/a |
| `public/assets/` | Images, audio, fonts, served as-is. | n/a |
| `tests/` | Vitest: sim, data, determinism, architecture rules. | No (client isn't unit-tested) |
| `electron/` | Desktop wrapper boilerplate (not wired up yet). | n/a |
| `server/` *(later)* | Node lockstep relay (M10). Imports `src/sim` types directly. | n/a |

`tests/architecture.test.ts` **enforces** the "no Phaser" column, and that `src/sim/` uses no
non-deterministic APIs.

## Scene flow

```
Boot ──► MainMenu ──► MatchSetup ──► Match (+ Hud on top)
            ▲            │ Back        │ Esc → PauseMenu → Exit
            └────────────┴─────────────┘
```

- **Boot:** loads assets, validates content (logs problems), applies settings.
- **MainMenu:** Play, Settings (modal), Exit (`window.close()`, which works under Electron).
- **MatchSetup:** map and faction pickers. Builds a `MatchConfig` (with a fresh seed) and starts
  Match.
- **Match:** `createWorld(config, gameData)`, then a fixed-step loop in `update()`: accumulate
  frame time, step the sim every 50 ms (catching up at most 5 ticks per frame), then update views
  with the interpolation factor. Launches `Hud`.
- **Hud:** a separate scene so it isn't affected by the match camera's zoom. Debug overlay (FPS,
  tick, checksum, selection) and the Esc menu. In single-player the Esc menu pauses the sim.

Modals (`ui/modal.ts`) are containers with a click-swallowing backdrop, created on top of the
current scene.

## Commands and ticks

Commands are plain data objects (`src/sim/commands.ts`), e.g.
`{ type: 'move', playerId, unitIds, target }`, with `tick` and `sequence` assigned when scheduled.

- They're **orders** (one per player decision), not per-frame state changes.
- **Single-player:** `CommandBridge.issue()` schedules for the next tick.
- **Multiplayer (later):** Commands are batched per turn (~150 ms), exchanged through a relay
  server with a 2-turn input delay, and applied by every client in the same order (tick, player,
  sequence). Checksums detect desyncs.
- The simulation **validates every Command** (shape, ownership). Invalid ones are dropped
  identically everywhere.
- A command log plus `MatchConfig` (with seed) is a **replay**.

## Determinism rules (`src/sim/`)

1. Integers only for state and rule maths. Positions in sim units (1 tile = 1000), angles in
   4096 steps per turn, speeds in sim units per tick. Divide with `idiv()`. Keep intermediates
   far below 2^53.
2. No `Math.random/sin/cos/tan/atan/sqrt/pow/hypot/exp/log`, no `Date`, no `performance.now`.
   Use `sim/math.ts` and `world.rng`.
3. Data floats (tiles, seconds) are converted to integers **once at spawn** with plain arithmetic
   and `Math.round`, which are exact and identical everywhere.
4. Iterate units in ascending id (`world.units` is a Map in insertion order). Sort anything
   else that comes from a Set or object keys.
5. Everything the sim needs comes from Commands, the `MatchConfig` and content data. Never from
   the client, the clock or the frame rate.
6. Keep `tests/determinism.test.ts` passing.

## Scale

- Simulation: 1 tile = 1000 sim units.
- View: 1 tile = `TILE_SIZE` = **32 px** (`src/client/scale.ts`). Changing it changes only the
  look, never gameplay.

## Persistence

| Data | Where | Format |
|---|---|---|
| Static game data | `content/` (bundled at build time) | JSON (see `data.md`) |
| Player settings | `localStorage` key `rugged-oil.settings` | JSON |
| Replays (later) | file / storage | `MatchConfig` + command log |

## Testing

`npm test` runs Vitest in Node:
- unit tests for `src/sim/` (math, grid and A*, formation, world);
- `content.test.ts`: all content is valid, and the validator catches each kind of mistake;
- `determinism.test.ts`: two runs of a scripted match produce identical checksums every tick;
- `architecture.test.ts`: the import and determinism rules above.

The client (`src/client/`) is checked by `npm run typecheck`, `npm run build` and by playing it
(`npm run dev`).
