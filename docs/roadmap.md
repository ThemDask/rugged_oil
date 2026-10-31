# Roadmap: Rugged Oil

Milestones are split by game system, not by faction: stats are data, so both factions' data goes
in early, and each milestone adds one system and ends with something playable. Rules, names and
numbers come from `high-level-design.md` (HLD); how they're built is in `low-level-design.md`
(LLD).

## M1: Foundation and data ✅
- [x] Restructure `src/` to the LLD layout; empty sim system files (orders, visibility, combat,
      projectiles, economy, capture, production, upgrades) wired into `step()` in LLD order
- [x] Content format: weapons, mounts, upgrades, unit weapon slots, maps with requisition points
      and reserves; `convert.ts` turns HLD units (metres, seconds, degrees) into sim units
- [x] All HLD appendix data for **both factions** as JSON (`league_`, `raiders_` ids), checked by
      the validator; HLD naming everywhere (manpower, oil, metal, HQ, extractor)
- [x] Test map: 256 × 256 tiles, obstacles, spawns, 6–8 requisition points, oil and metal reserves
- **Done when:** tests pass, the validator accepts all HLD data, determinism test green.

## M2: Menus, HUD and match shell ✅
- [x] Main menu (Play, Army viewer, Settings, Exit) and match setup (map, own faction, enemy
      faction, Start)
- [x] Match: map background, obstacles, both HQs spawned; camera (WASD, screen edges, zoom)
- [x] `HudScene` with the HLD layout (top bar, unit inspector, action grids, minimap) in the thin
      light-blue style, static values for now
- [x] Esc menu (pauses, Esc again closes) and the victory/defeat screen in place
- **Done when:** menu → match setup → a match with both HQs and the full HUD layout.

## M3: Control and movement ✅
- [x] Selection (click, box, Shift), control groups, move, stop, Shift-queued orders
- [x] Movement at the new scale; separation by size class
- [x] Order indicator lines, selection rectangles, live unit inspector, minimap dots and
      click-to-move-camera
- **Done when:** the HQ and debug-spawned units drive around the map comfortably.

## M4: Economy and production ✅
- [x] Player state: manpower, oil, metal, population
- [x] Manpower income; requisition capture (weights, neutralise, contested, decay)
- [x] Reserves and extraction: League hauling with max loads, Raiders gathering on the spot
- [x] Production: recruit buttons, pay at queue time, queue of 5, cancel with refund, population
      cap, spawn in a free spot; live top bar
- **Done when:** the economy loop (capture, extract, recruit) is playable with both factions.

## M5: Combat and fog of war ✅
- [x] Weapons on mounts with arcs, leading shots, projectiles as sim entities, piercing/armour
      damage, front/side/rear facings
- [x] Auto-targeting, attack, attack-move, hold fire, turning rules
- [x] Fog of war with line of sight (sim), feeding targeting, the fog layer and the minimap
- [x] Death; an HQ dying ends the match with the victory/defeat screen
- **Done when:** a full match is playable (debug control of both sides, or a passive enemy).

## M6: Upgrades ✅
- [x] Research at the HQ (1 minute), per-unit application with apply cost, automatic upgrades
- [x] The 4 effect types (add armour, add stat, add weapon, replace weapon); inspector shows
      upgraded stats
- **Done when:** all 6 HLD upgrades work.

## M7: AI opponent
- [ ] One difficulty, +25% income
- [ ] Recruits extractors and gathers, captures points, builds an army, attacks the HQ
- [ ] AI-vs-AI smoke test
- **Done when:** a full match against the AI can be won and lost.

## M8: Polish
- [ ] Real art (units, map background, obstacles), exhaust smoke, muzzle flashes, hit effects,
      sound
- [ ] Balance pass, bug fixing, settings content, Electron desktop build

## Later
- Multiplayer (deterministic lockstep through a relay server), Army viewer, more maps
