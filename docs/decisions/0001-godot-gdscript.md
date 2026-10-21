# 0001: Godot 4 with GDScript

**Status:** accepted · 2026-10-21

## Context
We need an engine that suits a small-team RTS and works well with an AI coding assistant, which
operates on files and command-line tools rather than an editor GUI.

## Decision
Godot 4.6 with GDScript, statically typed.

## Consequences
- Scenes (`.tscn`) and resources (`.tres`) are plain text, so they can be reviewed, diffed and
  edited outside the editor.
- Headless runs (`godot --headless`) allow automated tests and validation.
- Fast iteration (no compile step).
- If profiling later shows GDScript hot spots (e.g. pathfinding for hundreds of units), those
  parts can move to a GDExtension (C++) without changing the rest.
