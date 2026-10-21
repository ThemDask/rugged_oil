# Roadmap

Milestones are ordered by dependency. Each should end with something playable or testable.
Tick items off as they land.

## M0: Foundation ✅ (scaffold)
- [x] Repo layout, CLAUDE.md, docs, git
- [x] Data definition classes, GameData registry, content validator
- [x] Match setup types (MatchConfig, PlayerSlot)
- [x] Headless test runner

## M1: A unit on a map ✅
**Done when:** pressing F5 opens a test map with a few placeholder units. You can pan and zoom
the camera, select units by click or drag-box, and right-click to send them moving around
obstacles without piling on one spot.

- [x] Decide 2D vs 3D: 2D, top-down
- [x] **World scale:** `TILE_SIZE` constant (e.g. 32 px) and tile↔pixel helpers in `core/`.
      Data stays in tiles (see data.md).
- [x] **RTS camera** (`systems/camera/rts_camera.gd`, Camera2D): WASD/arrows and edge-scroll
      pan, mouse-wheel zoom toward the cursor, middle-drag pan, clamped to map bounds.
      Tunables exported for later settings.
- [x] **Test map** (`content/maps/test_map/`): code-drawn placeholder ground and grid, a few
      rectangular obstacles (StaticBody2D), and a NavigationRegion2D baked from them at load.
      Can be replaced later by a painted TileMapLayer with no code changes elsewhere.
- [x] **Unit entity** (`entities/units/unit.tscn`): CharacterBody2D + NavigationAgent2D
      (avoidance on). `setup(def, player_id, color)` configures it from a UnitDef. The
      placeholder look is a team-colored circle with a facing notch and a health bar, and it
      rotates toward its heading.
- [x] **Commands:** `MoveCommand` (unit ids + target), plus a `CommandDispatcher` system that
      validates ownership and executes, emitting `EventBus.command_issued`.
- [x] **Selection system** (`systems/selection/`): click select, shift-add, drag-box, own units
      only, selection ring. Right-click issues a MoveCommand with spread-out targets so a group
      doesn't stack on one point.
- [x] **Match scene stub** (`match/match.tscn`): builds a dev MatchConfig (human vs AI), loads the
      test map, and spawns each player's `starting_units` from their FactionDef at spawn points.
      Set as the run scene for now. The main menu comes in M7.
- [x] **Tests:** tile/pixel conversion, camera clamping maths, selection-rectangle maths, group
      target spreading, MoveCommand validation and serialization.

Out of scope for M1: buildings, combat, AI behaviour, fog, HUD (beyond a debug label).

## M2: Match bootstrap
- [ ] Match scene loads a MatchConfig, spawns factions' starting units/buildings
- [ ] Player ownership, team colors
- [ ] Win/lose detection, end screen

## M3: Economy and production
- [ ] Resource nodes, workers gather/return
- [ ] Building placement (footprint, validity)
- [ ] Production queues (TrainCommand), supply

## M4: Combat
- [ ] Attack, attack-move, auto-acquire targets
- [ ] Weapons from WeaponDef, damage/armor/bonuses, death
- [ ] Projectiles, basic effects

## M5: Fog of war and minimap

## M6: AI v1
- [ ] Build order, economy management, attack waves
- [ ] Difficulty levels

## M7: Skirmish UI
- [ ] Main menu, match setup screen, settings (ConfigFile)
- [ ] HUD: resources, selection panel, command card

## M8: Content and second faction identity
- [ ] Full rosters for both factions, tech progression
- [ ] 2–4 maps

## M9: Polish and ship
- [ ] Audio, VFX, balance pass, export presets
