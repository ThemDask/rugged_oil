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
- **Presentation:** top-down 2D on a square grid (Node2D, TileMapLayer, Camera2D,
  NavigationServer2D). Units are single sprites rotated to face their heading (no per-direction
  art). Isometric was rejected because it needs multi-direction sprite sets.
- **Art:** placeholder shapes drawn in code until real art exists. Then free CC0 packs
  (e.g. Kenney) or simple custom sprites. Logic must never depend on specific art.

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

1. Faction names, themes and identities (setting: sci-fi, medieval, modern...?).
2. Resource types: one resource, or several (e.g. a common and a rare one)? How are they gathered?
3. Supply/population system: is there a cap, and what raises it?
4. Roughly how many units and buildings per faction? (Suggested start: 5–8 units, 6–10 buildings.)
5. Tech progression: tiers, upgrades, research?
6. Unit control features: control groups, formations, attack-move, patrol, stances?
7. Maps: hand-made only, or procedural too? Player count per map (2, 4)?
8. AI difficulty levels: how many, and do they differ by skill only or also by resource bonuses?
9. Match length target (e.g. 15–25 minutes)?
