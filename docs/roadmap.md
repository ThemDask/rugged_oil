# Roadmap: Rugged Oil

Ordered by dependency. Each milestone ends playable or testable. **Current scope = M2–M6 for one
faction:** a full 1v1 match from main menu to destroying the enemy base vehicle, all built on the
deterministic simulation.

## M0: Foundation ✅ (Phaser + TypeScript, see ADR 0006)
- [x] Repo layout, CLAUDE.md, docs, git, Vite, Vitest
- [x] Content types, GameData registry, content validator, MatchConfig/PlayerSlot

## M1 + M1.5: Deterministic simulation and movement ✅
See `decisions/0005-deterministic-lockstep.md`.
- [x] `src/sim/`: SimWorld with fixed tick (20/s), integer sim units, seeded RNG, checksum
- [x] Commands scheduled per tick, applied in a fixed order, validated by the simulation
- [x] Map as a tile grid with clearance; grid A* (size-aware) with path smoothing
- [x] Vehicle movement: turn rate, acceleration, pivot in place, braking; unit separation
- [x] Views interpolate between ticks; RTS camera; click/box selection; move orders
- [x] Determinism test and architecture test

## M2: Game flow and menus (boilerplate done)
- [x] Main menu: Play, Settings, Exit (`MainMenuScene`)
- [x] Create-match screen: map + faction choice, opponent always AI (`MatchSetupScene`)
- [x] Settings modal: Audio, Video, Input (`ui/SettingsDialog`), saved in localStorage
- [x] Esc modal in matches with Exit, back to main menu (`ui/PauseMenu`, `HudScene`)
- [x] Desert placeholder look for the test map
- [ ] Settings content decided (design.md, "Match and options" questions); audio buses once
      there is audio; key rebinding if wanted

## M3: Base vehicle
- [x] Each player starts with exactly one base vehicle at their spawn (no buildings in the game)
- [x] Base vehicle in the simulation: big, slow, selectable, health (placeholder stats)
- [ ] Losing your base vehicle = defeat (detection in place, win/lose screen in M6)

## M4: Economy (fuel, workforce, metal)
- [ ] Per-player resource stock in the simulation, starting resources from GameRules
- [ ] Resource sites on maps (fuel, metal) and gathering without buildings (rules TBD, Q3–4)
- [ ] HUD resource bar

## M5: Production and upgrades
- [ ] Base vehicle trains units via a `train` Command, with a production queue
- [ ] Base vehicle upgrades via an `upgrade` Command (costs, requirements, tiers TBD: Q6, Q9)
- [ ] HUD: selection panel and command buttons

## M6: Combat and victory
- [ ] `attack` Command, auto-targeting, weapons from unit data, damage and armor, death
- [ ] Base vehicle destroyed means defeat. Win/lose screen, back to menu.
- [ ] AI v1: gathers, trains, upgrades and attacks with the same Commands as the player (`src/ai/`)

## M7: The hook: vehicles
- [ ] Vehicle modification and upgrades (question 6)

## M8: Second faction
- [ ] Asymmetric mechanics, roster, AI support

## M9: Content and polish
- [ ] More maps, balance pass, audio, effects, real art, Electron desktop build

## M10: Multiplayer (much later)
- [ ] Node relay server (`server/`), turn batching (~150 ms) with a 2-turn input delay
- [ ] Desync detection via checksums, lobby, reconnect/drop handling
- [ ] AI in multiplayer: deterministic AI or host-run AI
