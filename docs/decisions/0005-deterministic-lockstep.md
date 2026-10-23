# 0005: Deterministic simulation, lockstep-ready

**Status:** accepted · 2026-10-23 · supersedes the "determinism not a goal" note in 0003

## Context
Multiplayer is in scope for a much later sprint. RTS games with many units almost always use
**lockstep** networking: clients exchange only Commands, and every client runs the full
simulation. That requires a **bit-identical, deterministic simulation**, which is very costly
to retrofit, so it must be the foundation now.

## Decision
- All game state lives in a **simulation layer** (`core/sim/`): plain GDScript classes, no
  Nodes, no physics, no engine navigation.
- The simulation advances in a **fixed tick** (target 20 ticks/s), independent of the frame
  rate. Commands are applied at tick boundaries, in a fixed order (tick, player, sequence).
- **Integer maths only** for simulation state: 1 tile = 1000 sim units, speeds in units per tick.
  No float state, no float trig, sqrt or other float library functions inside the simulation.
- **Own pathfinding:** grid A* over map tiles with integer costs. Obstacles are blocked tiles.
  Godot's NavigationServer, NavigationAgent2D and avoidance are not used for gameplay.
- **Own unit separation:** a simple deterministic push-apart rule instead of RVO avoidance.
- **One seeded RNG** owned by the simulation (seed from `MatchConfig.random_seed`). Nothing else
  rolls dice for gameplay.
- **Stable iteration:** entities are processed in ascending id order.
- **State checksum** every tick, and a determinism test (same commands → same checksums).
- Nodes (`entities/`, `ui/`) are **views**. They read sim state, interpolate between ticks for
  smooth rendering, and play effects. They never change game state.
- Single-player uses the same path. Local commands are scheduled for the next tick.
  Multiplayer later replaces local scheduling with exchange via a relay server, with turns
  (e.g. 150 ms) and a 2-turn input delay.

## Consequences
- M1's movement (NavigationAgent2D, baked navmesh, RVO) is replaced in milestone M1.5. The
  camera, selection UI, commands, data layer and tests stay.
- More of our own code (pathfinding, separation), all testable without scenes.
- Strict rules for simulation code, written into `CLAUDE.md` and enforced by the determinism test.
- Lockstep's known weakness stays: every client knows the full state (map hacks possible).
