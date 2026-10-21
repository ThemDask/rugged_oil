# 0003: All state changes go through Commands

**Status:** accepted · 2026-10-21

## Context
Player input, AI and (potentially) replays and network peers all need to change game state.

## Decision
Every state-changing action is a `Command` object (`core/commands/command.gd`). Input handlers
and AI controllers create Commands; systems execute them.

## Consequences
- The AI cannot cheat by accident: it has the same verbs as the player.
- A command log plus `MatchConfig` and seed is a replay. Multiplayer (lockstep) stays possible,
  though it would additionally require a deterministic simulation, which is not a goal yet.
- Slight indirection for simple actions. Accepted.
