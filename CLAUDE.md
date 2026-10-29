# Rugged Oil

A **top-down 2D RTS** on a post-apocalyptic desert Earth (Mad Max vibes), built with **Phaser 3 +
TypeScript** (Vite, Vitest; desktop via Electron later). Golden-era RTS mechanics (StarCraft, Red
Alert 2) at a **slower, simpler pace**. Skirmish, **1v1 vs AI** for now. **Multiplayer comes in a
much later sprint via deterministic lockstep**, so the simulation is deterministic from day one
(`docs/decisions/0005-deterministic-lockstep.md`).

Design pillars (details, game flow and open questions in `docs/design.md`):
- **Three resources:** workforce (used by everything), fuel (spent to produce vehicles), metal
  (advanced units and upgrades, mid to late game).
- **The hook:** vehicles are expensive and can be heavily modified. (Fuel consumption while
  moving is parked: fuel is only a production cost.)
- **No buildings.** Each player starts with exactly **one base vehicle**, which produces all other
  units and does all upgrades. Destroying the enemy base vehicle wins, and losing yours loses.
- **Two asymmetric factions**, but **only the first (sturdy) faction is being built**. The
  second (Raiders) is deliberately left blank.
- **Small desert maps** with sparse resources and a few obstacles.
- Art is code-drawn placeholders for now.

Content in `content/` is a **placeholder** (`faction_a` with a base vehicle, gatherer and buggy)
until the user defines the faction. Don't invent design specifics; add open questions to
`docs/design.md` instead. The earlier space RTS concept is archived in `docs/archive/`, and the
old Godot project is on the local branch `archive/godot`; neither is current.

## Commands

```bash
npm run dev         # dev server at http://localhost:8080 (hot reload)
npm test            # Vitest: sim, content, determinism, architecture rules
npm run typecheck   # tsc over src/ and tests/
npm run build       # typecheck + production bundle in dist/
```

**Run `npm test` and `npm run typecheck` after every change.** The content test validates every
JSON file, and the architecture test enforces the determinism rules.

## Repository layout

```
docs/            design.md (what the game is), architecture.md (how it's built), data.md,
                 roadmap.md, decisions/ (ADRs), archive/ (old concepts, not current)
src/sim/         THE simulation: all game state, fixed tick, integer maths. No Phaser.
src/data/        content types, GameData registry, validator. No Phaser.
src/setup/       MatchConfig + PlayerSlot. No Phaser.
src/ai/          computer opponents: read the sim, return Commands. No Phaser.
src/client/      everything Phaser: main.ts, scenes/, views/, systems/, ui/, settings, scale
content/         game data as JSON (rules, factions, units, maps)
public/assets/   images, audio, fonts
tests/           Vitest (sim/, content, determinism, matchConfig, architecture)
electron/        desktop wrapper boilerplate (not wired up yet)
```

## Architecture rules (keep these)

1. **Data, not code, holds balance.** Stats live in `content/**/*.json`, typed by
   `src/data/types.ts`. Never hard-code a stat. Data is in **tiles and seconds** (turn rate in
   degrees per second), never pixels. See `docs/data.md`.
2. **Cross-references use ids** (globally unique, lower_snake_case, prefixed per faction: `a_`).
3. **All game-state changes go through Commands** (`src/sim/commands.ts`). Player input and AI
   produce the same Commands, through `CommandBridge` into `SimWorld.schedule()`.
4. **The simulation is deterministic.** All game state lives in `src/sim/`. There: integers only
   (1 tile = 1000 sim units, angles 4096 steps/turn, `idiv()` for division), no Math
   float functions, `Math.random`, `Date` or `performance.now` (use `sim/math.ts`, `world.rng`),
   units iterated in id order. Full rules: "Determinism rules" in `docs/architecture.md`.
5. **`src/sim`, `src/data`, `src/setup`, `src/ai` never import Phaser or `src/client`.**
   Views read sim state and never change it. `tests/architecture.test.ts` enforces this.
6. **Nothing assumes exactly two factions or players**: iterate over `gameData.factions()` and
   `config.players`.

## TypeScript conventions

- Strict mode, no `any`. 4-space indent, single quotes, semicolons.
- `camelCase` for functions and variables, `PascalCase` for classes, types and Phaser scenes
  (files holding a class or scene are named after it, e.g. `MatchScene.ts`; module files are
  `camelCase.ts`). `UPPER_CASE` for constants.
- Sim state is plain data (interfaces and Maps), not classes with hidden state, so it's easy to
  hash, clone and serialize.
- Each file starts with a short doc comment saying what it's for.
- Use `import type` for type-only imports.

## Tests

- Vitest, in `tests/**/*.test.ts`, running in Node. Test `src/sim`, `src/data`, `src/setup` and
  `src/ai` directly.
- New sim rules get unit tests. Anything affecting sim state must keep
  `tests/determinism.test.ts` passing. Extend `src/data/validate.ts` (and its tests) when content
  gains new kinds of references.
- The client is verified by typecheck, build and running it (`npm run dev`).

## Working agreements

- Design questions (unit roles, faction identity, numbers) belong to the user: write them as
  open questions in `docs/design.md` instead of inventing answers.
- Update `docs/` when a change alters architecture or data formats. Record significant decisions
  as a new ADR in `docs/decisions/`.
- Don't commit `dist/` or `node_modules/`.
