# 0006: Switch from Godot to Phaser + TypeScript

**Status:** accepted · 2026-10-29 · supersedes 0001 (Godot) and the file format part of 0002 (`.tres`)

## Context
The user has substantial Phaser experience and none in Godot. The game is 2D only, its core is a
deterministic simulation written as plain code (no engine features), and lockstep multiplayer later
needs a relay server. The Godot work so far (M0–M1 and a partial M1.5) was small.

## Decision
- **Phaser 3 + TypeScript**, bundled with **Vite**, tested with **Vitest** in plain Node.
- Desktop builds by wrapping the Vite output in **Electron** (boilerplate in `electron/`, not
  wired up yet).
- Static game data moves from `.tres` to **JSON** under `content/`, typed by `src/data/types.ts`
  and checked by `src/data/validate.ts`. The reasoning of 0002 (text files, no database,
  validation instead of a schema) still holds.
- The architecture is unchanged: deterministic simulation (`src/sim/`, see 0005), Phaser views
  that only read it, Commands as the only way to change state.
- The Godot project is kept on the local branch `archive/godot`.

## Consequences
- One language for client, simulation, tests and the future relay server (Node), which can import
  the simulation directly.
- Tests are fast and engine-free, and `tests/architecture.test.ts` enforces that `src/sim/` never
  imports Phaser or non-deterministic APIs.
- No visual scene editor. Maps are JSON (hand-written or from a future map tool), and UI is built
  in code.
- Desktop builds carry a bundled browser (~100 MB). Acceptable for a PC game.
