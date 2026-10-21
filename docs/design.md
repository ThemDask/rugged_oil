# Game design

Living design document. **Decided** sections are binding; **Open questions** are waiting on a
decision and shouldn't be guessed at in code.

## Pitch

A focused real-time strategy game: two distinct factions, base building, an economy, and army
combat. You play skirmish matches against computer opponents on maps you choose.

## Decided

- **Mode:** skirmish only. Player vs AI, in matches the player sets up. No campaign (for now).
- **Factions:** 2, asymmetric enough to play differently.
- **Match setup:** the player chooses map, number of opponents, each slot's faction, team, color
  and AI difficulty, plus match options (starting resources, fog of war, game speed).
- **Engine:** Godot 4.6, GDScript (see `decisions/0001-godot-gdscript.md`).

## Core loop

Gather resources → build structures → train units → scout and fight → destroy the enemy.

## Factions

| | Faction A (placeholder name) | Faction B (placeholder name) |
|---|---|---|
| Identity | TBD | TBD |
| Strengths | TBD | TBD |
| Weaknesses | TBD | TBD |
| Signature mechanic | TBD | TBD |

## Win / lose conditions

Default: a player is defeated when they lose all buildings (TBD: or all units *and* buildings).
A team wins when every opposing team is defeated.

## Open questions

1. **2D or 3D?** (top-down/isometric 2D sprites vs. 3D with an RTS camera). This affects art,
   pathfinding (NavigationServer2D vs 3D) and the entity scenes. *Highest priority.*
2. Faction names, themes and identities.
3. Resource types: one resource, or several (e.g. a common and a rare one)? How are they gathered?
4. Supply/population system: is there a cap, and what raises it?
5. Roughly how many units and buildings per faction? (Suggested start: 5–8 units, 6–10 buildings.)
6. Tech progression: tiers, upgrades, research?
7. Unit control features: control groups, formations, attack-move, patrol, stances?
8. Maps: hand-made only, or procedural too? Player count per map (2, 4)?
9. AI difficulty levels: how many, and do they differ by skill only or also by resource bonuses?
10. Match length target (e.g. 15–25 minutes)?
