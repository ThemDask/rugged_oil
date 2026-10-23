# Game design: Rugged Oil

Living design document. **Decided** is binding. **Direction** is the intended vision, which can
still change. **Open questions** wait on a decision and shouldn't be guessed at in code.

## Pitch

A top-down 2D RTS on a ruined, post-apocalyptic Earth, Mad Max style. Two asymmetric factions
fight over oil, metal and people in small desert maps. Golden-era RTS mechanics (StarCraft,
Red Alert 2), at a **slower, simpler pace**. The hook: **vehicles** are expensive, run on oil, and
can be heavily modified and upgraded.

## Decided

- **Genre:** classic base-building RTS: gather, build, train, fight. Top-down 2D.
- **Pace:** slower and simpler than the classics. Fewer units, fewer clicks, more decisions.
- **Setting:** post-apocalyptic Earth, desert wasteland, Mad Max vibes.
- **Mode:** skirmish only, **always 1v1 vs AI**.
- **Factions:** 2, asymmetric. **The current scope builds one faction first.** The AI uses the
  same faction until the second one exists.
- **Win condition:** each player starts with their own **HQ**. Destroy the enemy HQ to win; lose
  yours and you lose.
- **Buildings:** each faction has buildable buildings, and buildings produce units.
- **Resources (3):**
  - **Workforce:** used for everything.
  - **Oil:** used for vehicles, and as their **fuel** (vehicles burn oil to move).
  - **Metal:** for advanced units and buildings, mid to late game.
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

### Factions (asymmetric, identities TBD)
Two factions that play differently in the same economy. See open question 1.

### Economy
Sparse resources mean expansion and map control matter. Losing oil supply should hurt
vehicles directly (fuel).

## Open questions

1. **Faction identities.** You said the two factions stay "the same as before". The space design
   had *a fleet centred on a huge mothership* vs. *slowly expanding aliens*. A wasteland version
   could be a **mobile war-rig/convoy faction** (base on wheels, vehicle-heavy) vs. a
   **settler/cult faction that spreads territory** (cheap, numerous, holds ground). Is that the
   idea, or something else? Names?
2. **Which faction is built first?**
3. **Workforce:** where does it come from? (Housing that generates it over time? A population
   cap? Recruited at a building?) Is it spent and gone, or "occupied" while a unit lives (like
   supply)?
4. **Gathering:** how are oil and metal collected? (Oil wells/derricks on oil fields, scrap
   piles for metal? Harvester vehicles or workers?) Do nodes run out?
5. **Fuel rules:** what happens at 0 fuel (vehicle stops, slows, can't attack)? How do vehicles
   refuel (at buildings, tanker units, automatically)?
6. **Vehicle modification:** done where and when (workshop building, in-match, pre-game)? Slot-
   based (weapon, armor, engine)? Does it cost metal?
7. **Infantry:** are there non-vehicle units (cheap, workforce-only, no fuel)?
8. **Unit and building roster** for the first faction (roughly 4–6 of each to start?).
9. **Tech progression:** tiers gated by buildings, or by metal?
10. **AI difficulty levels** for the 1v1 opponent?
11. **Settings contents:** which audio sliders (master/music/effects), video options (window
    mode, resolution, vsync), and is input = key rebinding?
12. **Match length target?** (Slower pace suggests 20–30 minutes.)
