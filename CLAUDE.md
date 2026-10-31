# Rugged Oil

A **top-down 2D RTS** on a post-apocalyptic desert Earth (Mad Max / dieselpunk), built with
**Phaser 3 + TypeScript** (Vite, Vitest; desktop via Electron later). Slow, tactical gameplay.
Skirmish, **1v1 vs AI** for now. **Multiplayer comes in a much later sprint via deterministic
lockstep**, so the simulation is deterministic from day one (LLD section 2).

**`docs/high-level-design.md` (the HLD) is the source of truth** for game rules, names and numbers
(its appendix holds all unit, weapon, mount and upgrade stats). The user writes it. Follow its
naming everywhere (manpower, oil, metal, HQ, extractor, requisition point). Don't invent design
specifics; ask the user instead. **`docs/low-level-design.md` (the LLD)** says how the code
implements the HLD.

In short: no buildings, each player has one mobile **HQ** that recruits all units and buys
upgrades, and destroying the enemy HQ wins. Two factions, **League** and **Raiders**, both
playable. Three resources: **manpower** (infinite, from requisition points), **oil** and
**metal** (finite reserves, gathered by extractors). Very little automation: units never move on
their own.

The user provides the 2D art over time. Until then, everything visible (units, projectiles,
reserves, obstacles, HUD symbols) uses placeholders with the same texture keys and sizes the real
art will use, so art can be swapped in without code changes (LLD section 13).

Content in `content/` is still a **placeholder** (`faction_a`) until it is rebuilt from the HLD
appendix. The old Godot project is on the local branch `archive/godot` and is not current.

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
docs/            high-level-design.md (HLD: what the game is), low-level-design.md (LLD: how
                 it's built), roadmap.md, images/
src/sim/         THE simulation: all game state, fixed tick, integer maths. No Phaser.
src/data/        content types, GameData registry, validator, unit conversion. No Phaser.
src/setup/       MatchConfig + PlayerSlot. No Phaser.
src/ai/          computer opponents: read the sim, return Commands. No Phaser.
src/client/      everything Phaser: main.ts, scenes/, views/, systems/, hud/, ui/, settings, scale
content/         game data as JSON (rules, factions, units, weapons, mounts, upgrades, maps)
public/assets/   images, audio, fonts
tests/           Vitest (sim/, content, determinism, matchConfig, architecture)
electron/        desktop wrapper boilerplate (not wired up yet)
```

## Architecture rules (keep these)

1. **Data, not code, holds balance.** Stats live in `content/**/*.json`, typed by
   `src/data/types.ts`. Never hard-code a stat. Data is in **HLD units** (metres, seconds,
   degrees), never pixels or sim units; it's converted once at load. See LLD section 12.
2. **Cross-references use ids** (globally unique, lower_snake_case, prefixed per faction:
   `league_`, `raiders_`; shared weapons and mounts have no prefix).
3. **All game-state changes go through Commands** (`src/sim/commands.ts`). Player input and AI
   produce the same Commands, through `CommandBridge` into `SimWorld.schedule()`.
4. **The simulation is deterministic.** All game state lives in `src/sim/`. There: integers only
   (1 tile = 10 m = 1000 sim units, angles 4096 steps/turn, `idiv()` for division), no Math
   float functions, `Math.random`, `Date` or `performance.now` (use `sim/math.ts`, `world.rng`),
   entities iterated in id order, dead entities removed only at the end of a tick. Full rules:
   LLD section 3.
5. **`src/sim`, `src/data`, `src/setup`, `src/ai` never import Phaser or `src/client`.**
   Views and the HUD read sim state and never change it. `tests/architecture.test.ts` enforces
   this.
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

- Design questions (unit roles, numbers, rules) belong to the user: ask instead of inventing
  answers. Keep follow-up questions few and only for real blockers.
- Update the LLD when a change alters architecture or data formats, including significant
  technical decisions and why they were made.
- Don't commit `dist/` or `node_modules/`.
