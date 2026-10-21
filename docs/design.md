# Game design

Living design document. **Decided** sections are binding. **Direction** is the intended vision,
which can still change. **Open questions** are waiting on a decision and shouldn't be guessed at
in code.

## Pitch

A slow-paced, tactical **space RTS**. Two very different factions: a fleet built around a huge
mothership, and an alien swarm that slowly spreads across the map. You play skirmish matches
against computer opponents, with pre-game customisation for replayability.

## Decided

- **Mode:** skirmish vs AI, in matches the player sets up. (A campaign is a *maybe*, see below.)
- **Factions:** 2, strongly asymmetric.
- **Match setup:** the player chooses map, number of opponents, each slot's faction, team, color
  and AI difficulty, plus match options (starting resources, fog of war, game speed).
- **Engine:** Godot 4.6, GDScript (see `decisions/0001-godot-gdscript.md`).
- **Presentation:** top-down 2D on a square grid (Node2D, TileMapLayer, Camera2D,
  NavigationServer2D). Units are single sprites rotated to face their heading (no per-direction
  art). Isometric was rejected because it needs multi-direction sprite sets.
- **Art:** placeholder shapes drawn in code until real art exists. Logic must never depend on
  specific art.

## Direction (vision notes, 2026-10-21)

### Setting
Space. Maps are regions of space (asteroids, nebulae and similar as terrain/obstacles: TBD).

### Pace and feel
- **Slow, laid-back but tactical.** No rush strategies and no APM race. Decisions matter more
  than click speed.
- Positioning, fleet composition and engagement choice should win games, not micro-spam.

### Factions

**Fleet faction (mothership)**
- Built around one **huge mothership**, about **10× the size** of the basic unit.
- Basic unit: the **corvette** (fills the "basic infantry" role).
- Feels like a mobile, centralised force: protect and position the mothership.

**Alien faction (swarm)**
- **Slowly expands** across the map, Zerg-like: territory and spread are part of its economy
  and strength.
- Feels organic and creeping versus the fleet's centralised power.

### Units and movement
- **Big size differences** between units (corvette → mothership is ~10×).
- **Turn rate scales with size:** big ships turn slowly and commit to a heading, small ships are
  nimble.

### Visual style
- **Minimal, sharp-edged** shapes with **thin grey outlines**: clean, geometric, readable.
- This fits code-drawn or simple vector art well, and the current placeholder approach can grow
  into the final look.

### Replayability: pre-game customisation
- Some player customisation before a match (e.g. choose loadouts, starting fleet variants,
  faction perks/doctrines: TBD) so matches play differently.

### Campaign (maybe, later)
- Possible campaign with **progression points** (persistent unlocks/upgrades between missions).
- Not in scope now. Keep the customisation system general enough that a campaign could feed
  it later.

## Implications to keep in mind (no implementation yet)

These are notes on how the vision touches the existing code. They become tasks when we get there.

- **Turn rate** needs a new unit stat (e.g. `turn_rate` in degrees per second) and movement that
  turns before or while accelerating, instead of the current instant facing.
- **10× size range** affects navigation: one navmesh clearance doesn't fit both a corvette and a
  mothership. Options: navigation layers per size class, or large ships using simpler steering.
  Avoidance and formation spacing already scale with radius.
- **Mothership** is probably a unit that also acts as a production building (it fits
  `UnitDef` + production fields, or a shared "producer" capability).
- **Alien spread** suggests a territory/creep grid system (`systems/territory/`) that the
  economy, building placement and maybe vision depend on.
- **Pre-game customisation** extends `MatchConfig`/`PlayerSlot` (e.g. a chosen doctrine or loadout
  id), with the options themselves stored as data in `content/`.
- **Campaign progression** would be player save data in `user://`, not `content/`.
- **Slow pace** is mostly tuning (build times, speeds, economy rate) and lives in data. Good
  news for balancing.

## Core loop

Gather resources → build up (fleet/swarm) → scout and position → fight decisive engagements →
destroy the enemy.

## Win / lose conditions

Default: a player is defeated when they lose all buildings (TBD: or all units *and* buildings).
For the fleet faction, is losing the mothership an instant loss? (Open question 7.)
A team wins when every opposing team is defeated.

## Open questions

1. Faction names and lore.
2. Resources: what are they in space (asteroid ore, gas, energy)? One or several? How does each
   faction gather them? Does alien creep itself generate income?
3. Mothership role: is it the fleet's only production source? Can it move freely, or only slowly
   or with restrictions? Can there be more than one?
4. Alien expansion: how does spreading work (creep tiles, spawning nodes, infesting asteroids)?
   Can the fleet clear it?
5. Supply/population system: is there a cap, and what raises it?
6. Unit rosters: roughly how many types per faction, and their roles beyond the corvette?
7. Is losing the mothership an instant defeat, or a severe setback?
8. Pre-game customisation: what exactly can players pick (doctrines, starting fleets, perks,
   cosmetics)? Is it balanced against each other?
9. Combat feel: weapon types (projectiles, beams, missiles), shields vs hull, ship facing
   mattering (e.g. broadside weapons on big ships)?
10. Maps: hand-made only, or procedural too? Player count per map (2, 4)? What terrain exists
    in space?
11. AI difficulty levels: how many, and do they differ by skill only or also by resource bonuses?
12. Match length target? (A slow pace suggests 25–45 minutes.)
13. Campaign: yes or no, and if yes, after skirmish is complete?
