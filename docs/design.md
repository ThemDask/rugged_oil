# Game design: Rugged Oil

Living design document. **Decided** is binding. **Direction** is the intended vision, which can
still change. **Open questions** wait on a decision and shouldn't be guessed at in code.

## Pitch

A top-down 2D RTS on a ruined, post-apocalyptic Earth, Mad Max style. Two asymmetric factions
fight over fuel, metal and people in small desert maps. **There are no buildings:** each side's
base is one huge **base vehicle** that produces every other unit and does all the upgrades.
Golden-era RTS mechanics (StarCraft, Red Alert 2), at a **slower, simpler pace**. The hook:
**vehicles** are expensive, run on fuel, and can be heavily modified and upgraded.

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
    base vehicle. **Built first.**
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
  - **Workforce:** used for everything. **Income** that accumulates and is spent, like
    requisition in Company of Heroes. Comes from **controlling points (flags) on the map**.
    **Infinite:** a held point keeps producing.
  - **Fuel:** one resource (there is no separate "oil"). Spent to build vehicles **and** burned
    by vehicles as they move.
  - **Metal:** for advanced units and upgrades, mid to late game.
  - **Fuel and metal come from separate sites on the map** (fuel sites, scrap sites). Sites are
    **finite** and run out. **Both factions use the same sites.**
- **Control points:** captured by **standing nearby for a few seconds. Every unit can capture.**
- **Gathering:** each faction has **one gatherer vehicle type** (a single unit, not separate
  hauler and salvager units), and **only gatherers gather**. Its behaviour depends on the faction:
  - **Second faction:** the gatherer collects at a site and **brings loads back to the base
    vehicle**.
  - **Raiders:** the gatherer **salvages on the spot**: no trip back, but **slower**.
- **Fuel in vehicles:** each vehicle has a fuel tank that drains while it moves.
  - **Empty tank:** the vehicle **slows to a crawl, then stops.** It **can still shoot.**
  - **Refuelling:** **tanker vehicles** drive around and refuel other vehicles in the field.
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
- Vehicles are **expensive** and **burn fuel while moving**, so logistics matter: where's
  your fuel, how far can your convoy go, and are your tankers safe?
- **Tankers** are the logistics layer: protect yours, hunt theirs. A stranded convoy can still
  fight but can't move.
- Vehicles can be **heavily modified and upgraded** (armor plating, weapons, engines,
  fuel tanks...): the main source of depth and variety.

### The base vehicle
- The heart of each side: production, upgrades, and the loss condition all in one unit, so
  **protecting and positioning it is the core strategic tension**. Moving it toward resources
  or the front is powerful but risky.
- It's big and slow, and it burns fuel like every vehicle, so relocating the base is a real
  decision. It starts with a full tank, so early moves are free-ish, but long-term mobility
  depends on fuel income and tankers.
- Light defences buy time against early rushes but can't hold off a real army.

### Factions
- **Raiders:** fast, vulnerable, salvage on the spot. Hit-and-run, hunt tankers and gatherers.
- **Second faction (name TBD):** sturdy, slow, haul resources back to the base vehicle.
  Defensive, convoy-oriented. Built first.

### Economy
Sparse resources mean map control matters. Without buildings, "expansion" means sending
units (or the base vehicle itself) to resource sites. Losing fuel supply hurts vehicles
directly.
- **Workforce = territory:** holding control points is how you grow, so the map has a natural
  "fight over the flags" layer, as in CoH and DoW.
- **Hauling vs. salvaging** gives the factions different economic shapes. Haulers are faster
  but tied to the base vehicle's position and vulnerable on the road. Salvagers are slower but
  spread out and independent of the base vehicle.

## Open questions

### Factions
1. **Second faction:** name and theme (sturdy, slow, hauls). Base vehicle names for both?

### Economy
2. **Control points:** neutral at match start? How many per map (e.g. 5–7 on a small map)? How
   much workforce per point? Can a contested point be neutralised before it's taken?
3. **Resource sites:** how much does one site hold? Roughly how many fuel and scrap sites per map?
4. **Gatherer confirmation:** "only gatherers gather" (the voice transcript read "not only the
   gatherers", which we interpreted as "only the gatherers"). Correct?

### Fuel
5. **Tank vs. stockpile:** when a tanker refuels a vehicle, does that fuel come from the
   player's fuel stockpile (tankers carry it from there), or do tankers fill up at fuel sites?
6. **Tanker basics:** does the tanker refill itself at the base vehicle? Does it refuel
   automatically in range, or by command? Can it explode?
7. **Base vehicle refuelling:** from tankers like everything else, or directly from the
   stockpile?

### Base vehicle
8. **Repair:** who repairs it (dedicated mechanic unit, itself over time, an upgrade)? Does it
    cost resources (metal?)?
9. **Production while moving:** do new units appear beside it as it drives, and can it be
    given a rally point?

### Modifications and tech
10. **Scope of a modification:** is it **per individual unit** (this buggy gets armor plating)
    or **per unit type** (all buggies get it)?
11. **Mod slots:** fixed slots (weapon, armor, engine, fuel tank...) with one choice each, or a
    free list of upgrades? Can a mod be swapped later?
12. **Mod and tier costs:** which resources (metal for mods, fuel plus workforce for tiers)? How
    many tiers (e.g. 3)?

### Units
13. **Infantry:** are there non-vehicle units (cheap, workforce-only, no fuel, good at
    capturing points)?
14. **Unit roster** for the first faction (roughly 4–6 units to start?).

### Match and options
15. **AI difficulty levels** for the 1v1 opponent?
16. **Settings contents:** which audio sliders (master/music/effects), video options (window
    mode, resolution, vsync), and is input = key rebinding?
17. **Match length target?** (Slower pace suggests 20–30 minutes.)
