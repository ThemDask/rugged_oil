# 0002: Static game data as Godot Resources (.tres)

**Status:** accepted · 2026-10-21

## Context
Unit, building, weapon and faction stats must be easy to add and rebalance. The options were JSON
files, a database (e.g. SQLite) and Godot custom Resources.

## Decision
Typed custom Resources (`core/defs/*.gd`) stored as text `.tres` files in `content/`, loaded once
into the `GameData` registry. Cross-references use string ids.

## Why not JSON
JSON would work, but it is untyped: we'd need to write parsing and validation code, asset
references (scenes, icons) become strings, and there's no inspector editing. Resources give us
types, inspector editing and direct asset references for free, and they're still diffable text.
If external tools or modding ever need JSON, an importer can generate `.tres` from it.

## Why not a database
The data is small (tens to hundreds of records), read-only at runtime and loaded entirely into
memory, so a database adds no capability. It would add a native plugin dependency and a binary
file that can't be diffed, merged or edited as text. Databases suit large, mutable, queryable
data, such as an online backend, which this game doesn't have.

## Consequences
- Balance changes are reviewable diffs.
- `ContentValidator` is responsible for the referential checks a database schema would have done.
- Bulk spreadsheet editing would need a CSV export/import tool (deferred).
