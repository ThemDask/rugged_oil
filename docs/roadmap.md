# Roadmap

Milestones are ordered by dependency. Each should end with something playable or testable.
Tick items off as they land.

## M0: Foundation ✅ (scaffold)
- [x] Repo layout, CLAUDE.md, docs, git
- [x] Data definition classes, GameData registry, content validator
- [x] Match setup types (MatchConfig, PlayerSlot)
- [x] Headless test runner

## M1: A unit on a map
- [ ] Decide 2D vs 3D (design.md, open question 1)
- [ ] RTS camera (pan, zoom, edge scroll)
- [ ] Test map with navigation
- [ ] Unit entity scene configured from a UnitDef
- [ ] Select (click, drag-box) and move via MoveCommand

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
