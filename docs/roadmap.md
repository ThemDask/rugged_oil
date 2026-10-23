# Roadmap: Rugged Oil

Ordered by dependency. Each milestone ends playable or testable. **Current scope = M2–M6 for one
faction:** a full 1v1 match from main menu to destroying the enemy HQ, preceded by M1.5 so
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

## M3: Buildings and HQ
- [ ] Building entity configured from a BuildingDef (footprint, health, placeholder look)
- [ ] Each player starts with their faction's HQ at their spawn
- [ ] Buildings block navigation (navmesh rebake or obstacles)
- [ ] Select buildings

## M4: Economy (oil, workforce, metal)
- [ ] Per-player resource stock (`systems/economy`), starting resources from GameRules
- [ ] Resource nodes on maps (oil, metal) and gathering (rules TBD, design.md questions 3–4)
- [ ] HUD resource bar

## M5: Construction and production
- [ ] Build buildings (placement preview, validity, cost) via BuildCommand
- [ ] Train units at buildings via TrainCommand, production queue (`systems/production`)
- [ ] HUD: selection panel and command buttons

## M6: Combat and victory
- [ ] AttackCommand, auto-targeting, weapons from WeaponDef, damage and armor, death
- [ ] HQ destroyed means defeat. Win/lose screen, back to menu.
- [ ] AI v1: builds, trains and attacks with the same Commands as the player (`ai/`)

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
