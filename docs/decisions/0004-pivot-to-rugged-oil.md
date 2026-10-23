# 0004: Pivot from the space RTS to Rugged Oil

**Status:** accepted · 2026-10-23

## Context
The asymmetric space RTS (mothership vs. alien swarm, 10× size range, slow-turning ships) needed
hard problems solved early: multi-size navigation, turn-rate movement and very different faction
mechanics. That's a lot to take on before having a fun core loop.

## Decision
Build a simpler, classic top-down 2D RTS first, **Rugged Oil**: post-apocalyptic desert,
golden-era RTS mechanics (StarCraft, Red Alert 2) at a slower pace. It lives in this same
repository. The space design is archived in `docs/archive/space-rts-design.md`.

## Consequences
- M0 and M1 (data layer, commands, camera, selection, pathfinding, tests) are genre-generic
  and carry over unchanged.
- The placeholder faction content was reset to the new setting (three resources, one faction).
- The space RTS can be revisited later as its own project, reusing this codebase as a template.
