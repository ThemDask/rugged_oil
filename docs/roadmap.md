# Roadmap: Rugged Oil

Ordered by dependency. Each milestone ends playable or testable. **Current scope = M2–M6 for one
faction:** a full 1v1 match from main menu to destroying the enemy base vehicle, preceded by M1.5 so
everything is built on the deterministic simulation.

## M0: Foundation ✅
- [x] Repo layout, CLAUDE.md, docs, git, headless test runner
- [x] Data definitions, GameData registry, content validator, MatchConfig/PlayerSlot

## M1: Units on a map ✅
- [x] World scale (`Tiles`), RTS camera, test map with baked navigation
- [x] Unit entity, MoveCommand + CommandDispatcher, click/box selection, group spreading
- [x] GameMatch scene spawning starting units from a dev MatchConfig

## M1.5: Deterministic simulation core
See `decisions/0005-deterministic-lockstep.md`. Rebuilds M1's movement on the simulation.
- [ ] `core/sim/`: simulation state, fixed tick loop (20/s), integer sim units, seeded RNG
- [ ] Commands scheduled per tick and applied in a fixed order. The simulation validates them.
- [ ] Map as a tile grid: blocked tiles from obstacles, spawn points
- [ ] Grid A* pathfinding (integer costs) and deterministic unit separation
- [ ] Units live in the simulation. Unit nodes become views that interpolate between ticks.
- [ ] Remove Godot navigation from gameplay (NavigationAgent2D, navmesh baking, RVO)
- [ ] State checksum, plus a determinism test (same seed and commands → same checksums)

## M2: Game flow and menus
- [ ] Main menu: Play, Settings, Exit (`ui/menus/main_menu`)
- [ ] Create-match screen: map + faction choice, opponent always AI; builds a MatchConfig and
      starts the match (`ui/menus/match_setup`)
- [ ] Settings modal: Audio, Video, Input sections (`ui/dialogs/settings_dialog`), stored by a
      `Settings` autoload in `user://settings.cfg`, applied on startup
- [ ] Escape modal in matches with Exit, back to main menu (`ui/dialogs/pause_menu`)
- [ ] Main menu becomes the run scene again
- [ ] Desert look for the test map

## M3: Base vehicle
- [ ] Each player starts with exactly one base vehicle at their spawn (no buildings in the game)
- [ ] Base vehicle in the simulation: big, slow, selectable, health (details: design.md Q11)
- [ ] Losing your base vehicle = defeat (detection in place, win/lose screen in M6)

## M4: Economy (oil, workforce, metal)
- [ ] Per-player resource stock in the simulation, starting resources from GameRules
- [ ] Resource sites on maps (oil, metal) and gathering without buildings (rules TBD, Q3–4)
- [ ] HUD resource bar

## M5: Production and upgrades
- [ ] Base vehicle trains units via TrainCommand, with a production queue
- [ ] Base vehicle upgrades via UpgradeCommand (costs, requirements, tiers TBD: Q6, Q9)
- [ ] HUD: selection panel and command buttons

## M6: Combat and victory
- [ ] AttackCommand, auto-targeting, weapons from WeaponDef, damage and armor, death
- [ ] Base vehicle destroyed means defeat. Win/lose screen, back to menu.
- [ ] AI v1: gathers, trains, upgrades and attacks with the same Commands as the player (`ai/`)

## M7: The hook: vehicles
- [ ] Fuel: vehicles consume oil while moving, refuelling (rules TBD, question 5)
- [ ] Vehicle modification and upgrades (question 6)

## M8: Second faction
- [ ] Asymmetric mechanics, roster, AI support

## M9: Content and polish
- [ ] More maps, balance pass, audio, effects, real art, export presets

## M10: Multiplayer (much later)
- [ ] Relay server, turn batching (~150 ms) with a 2-turn input delay
- [ ] Desync detection via checksums, lobby, reconnect/drop handling
- [ ] AI in multiplayer: deterministic AI or host-run AI
