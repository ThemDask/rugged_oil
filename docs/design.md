# Game design: Rugged Oil

Living design document. **Decided** is binding. **Direction** is the intended vision, which can
still change. **Open questions** wait on a decision and shouldn't be guessed at in code.

## Pitch

A top-down 2D RTS on a ruined, post-apocalyptic Earth, Mad Max style. Two asymmetric factions
fight over oil, metal and people in small desert maps. **There are no buildings:** each side's
base is one huge **base vehicle** that produces every other unit and does all the upgrades.
Golden-era RTS mechanics (StarCraft, Red Alert 2), at a **slower, simpler pace**. The hook:
**vehicles** are expensive, run on oil, and can be heavily modified and upgraded.

## Decided

- **Genre:** classic RTS (gather, produce, upgrade, fight), but with a **mobile base instead
  of buildings**. Top-down 2D.
- **Pace:** slower and simpler than the classics. Fewer units, fewer clicks, more decisions.
- **Setting:** post-apocalyptic Earth, desert wasteland, Mad Max vibes.
- **Mode:** skirmish, **1v1 vs AI**. **Multiplayer later** (much later sprint), via
  deterministic lockstep (see `decisions/0005-deterministic-lockstep.md`).
- **Factions:** 2, asymmetric. **The current scope builds one faction first.** The AI uses the
  same faction until the second one exists.
  - **Raiders:** **fast but vulnerable.** They salvage resources on the spot.
  - **Second faction (name TBD):** **sturdier but slower.** They haul resources back to their
    base vehicle.
- **Start:** each player starts with **exactly one vehicle, their base vehicle**: a big, slow
  vehicle that acts as the whole base.
- **No buildings.** Nothing is constructed. The base vehicle replaces HQ, factories and
  research buildings.
- **Base vehicle:** **produces all other units** and performs **all upgrades** (including
  vehicle modifications). Both factions have one, and they differ (asymmetric).
  - **Exactly one per player**, never more.
  - Has **light defences** to counter early rushes (not a front-line fighter).
  - **Moves and produces at the same time.**
  - **Can be repaired.**
  - Starts with a **full fuel tank** and **burns fuel** like every vehicle.
- **No static structures** of any kind: no buildings, turrets, walls or neutral structures.
  Maps contain only terrain, obstacles, resource sites and control points.
- **Win condition:** **destroy the enemy base vehicle.** If yours dies, you lose.
- **Resources (3):**
  - **Workforce:** used for everything. Comes from **controlling points (flags) on the map**,
    like the strategic points in Company of Heroes and Dawn of War. **Infinite:** a held point
    keeps producing.
  - **Oil:** used for vehicles, and as their **fuel** (vehicles burn oil to move).
  - **Metal:** for advanced units and upgrades, mid to late game.
  - **Oil and metal are found on the map and are finite:** sites run out.
- **Gathering:** each faction has **one gatherer vehicle type** (a single unit, not separate
  hauler and salvager units). Its behaviour depends on the faction:
  - **Second faction:** the gatherer collects at a site and **brings loads back to the base
    vehicle**.
  - **Raiders:** the gatherer **salvages on the spot**: no trip back, but **slower**.
- **Tech:** progression is **tiers bought as upgrades on the base vehicle**.
- **Modifications apply on the spot:** a unit doesn't need to return to the base vehicle to
  be upgraded or modified.
- **Maps:** small, simple desert maps with sparse resources and a few obstacles.
- **Engine:** Godot 4.6, GDScript, top-down 2D (see `decisions/0001-godot-gdscript.md`).
- **Art:** placeholder shapes drawn in code until real art exists. Logic never depends on art.

## Game flow (current scope)

```
Main menu ── Play ──► Create match (choose map + faction) ── Start ──► Match
   │                         │ Back                                     │ Esc
   ├─ Settings ─► modal: Audio · Video · Input                          ▼
   └─ Exit ─► quit game                                     Escape modal: Exit
                                                            (ends match, back to main menu)
```

- **Main menu:** Play, Settings, Exit.
- **Create match:** pick map and faction (opponent is always one AI). Start / Back.
- **Settings:** a modal window with Audio, Video and Input sections, saved between sessions.
- **Escape menu:** Esc in a match opens a modal with Exit, which ends the match and returns to
  the main menu.

## Direction

### The hook: vehicles
- Vehicles are **expensive** and **consume oil while moving**, so logistics matter: where's
  your oil, and how far can your convoy go?
- Vehicles can be **heavily modified and upgraded** (armor plating, weapons, engines,
  fuel tanks...): the main source of depth and variety.

### The base vehicle
- The heart of each side: production, upgrades, and the loss condition all in one unit, so
  **protecting and positioning it is the core strategic tension**. Moving it toward resources
  or the front is powerful but risky.
- It's big and slow, and it burns fuel like every vehicle, so relocating the base is a real
  decision. It starts with a full tank, so early moves are free-ish, but long-term mobility
  depends on oil income.
- Light defences buy time against early rushes but can't hold off a real army.

### Factions (asymmetric, identities TBD)
Two factions that play differently in the same economy, each around its own base vehicle. See
open question 1.

### Economy
Sparse resources mean map control matters. Without buildings, "expansion" means sending
units (or the base vehicle itself) to resource sites. Losing oil supply hurts vehicles directly
(fuel).
- **Workforce = territory:** holding control points is how you grow, so the map has a natural
  "fight over the flags" layer, as in CoH and DoW.
- **Hauling vs. salvaging** gives the factions different economic shapes. Haulers are faster
  but tied to the base vehicle's position and vulnerable on the road. Salvagers are slower but
  spread out and independent of the base vehicle.

## Open questions

### Factions
1. **Second faction:** name and theme (sturdy, slow, hauls). Base vehicle names for both?
2. **Which faction is built first:** Raiders or the second faction?

### Economy
3. **Control points:** how are they captured (a unit stands nearby for N seconds? some units
   can't capture)? Neutral at match start? How many per map (e.g. 5–7 on a small map)?
4. **Workforce from points:** is it **income** that accumulates and is spent (CoH-style
   requisition), or a **cap** that units occupy while alive? Or both: points raise the cap and
   produce income?
5. ~~Who gathers?~~ Decided: one dedicated gatherer vehicle per faction.
6. **Resource sites:** separate oil sites and metal (scrap) sites, or mixed? Do both factions
   use the same sites? How much does one site hold?
7. **Oil vs. fuel:** is fuel drawn from the shared oil stockpile, or is a vehicle's fuel tank
   separate (oil is spent once to fill it)?

### Fuel
8. **Empty tank:** what happens at 0 fuel (stops dead, crawls slowly, can still shoot)?
9. **Refuelling:** at the base vehicle, from tanker units, automatically in range of the base
   vehicle? Can the base vehicle refuel itself from the oil stockpile?

### Base vehicle
10. **Repair:** who repairs it (dedicated mechanic unit, itself over time, an upgrade)? Does it
    cost resources (metal?)?
11. **Production while moving:** do new units appear beside it as it drives, and can it be
    given a rally point?

### Modifications and tech
12. **Scope of a modification:** is it **per individual unit** (this buggy gets armor plating)
    or **per unit type** (all buggies get it)?
13. **Mod slots:** fixed slots (weapon, armor, engine, fuel tank...) with one choice each, or a
    free list of upgrades? Can a mod be swapped later?
14. **Mod and tier costs:** which resources (metal for mods, oil plus workforce for tiers)? How
    many tiers (e.g. 3)?

### Units
15. **Infantry:** are there non-vehicle units (cheap, workforce-only, no fuel, good at
    capturing points)?
16. **Unit roster** for the first faction (roughly 4–6 units to start?).

### Match and options
17. **AI difficulty levels** for the 1v1 opponent?
18. **Settings contents:** which audio sliders (master/music/effects), video options (window
    mode, resolution, vsync), and is input = key rebinding?
19. **Match length target?** (Slower pace suggests 20–30 minutes.)
