# newRTS

A 2-faction **space RTS**, **top-down 2D**, built in **Godot 4.6 with GDScript**. Scope: skirmish
matches the player configures (map, opponents, factions, teams, pre-game customisation) against AI.
No multiplayer, and a campaign is only a "maybe, later", but the architecture keeps both possible
(see `docs/architecture.md`).

Design pillars (details and open questions in `docs/design.md`):
- **Slow, tactical, no APM race:** positioning, composition and choosing fights beat click speed.
- **Strong asymmetry:** a fleet built around a huge mothership vs. slowly expanding aliens.
- **Big size range:** the mothership is ~10× a corvette, and big ships turn slowly.
- **Minimal visuals:** sharp-edged shapes, thin grey outlines. Art is code-drawn placeholders for now.

The current faction content (`faction_a`/`faction_b`, workers, infantry, gold) is a **placeholder**
from before the setting was chosen. Don't build on its specifics.

## Commands

```powershell
./tools/run_tests.ps1                 # full headless test suite (exit code 0 = pass)
./tools/run_tests.ps1 -Filter content # only test files/methods whose name contains "content"
```

The script finds Godot via `-Godot <path>`, then `$env:GODOT`, then `godot` on PATH. Use the
**console** build of Godot (`*_console.exe` on Windows) so output reaches the terminal.
Machine-specific paths live in `CLAUDE.local.md` (gitignored).

**Run the tests after every change to GDScript or content.** The content test validates every
`.tres` definition, so it catches broken ids and bad stats too.

## Repository layout

```
docs/                 design.md (what the game is), architecture.md (how it is built),
                      data.md (how game data works), roadmap.md, decisions/ (ADRs)
tools/                developer scripts (test runner, future data import/export)
game/                 the Godot project, res:// root
  autoload/           singletons: EventBus (global signals), GameData (content registry)
  core/               engine-light game rules and types; no scene-tree dependencies
                      (Tiles = world scale, Formation = group spreading, ContentValidator)
    defs/             Resource classes describing static data (UnitDef, BuildingDef, MapDef, ...)
    setup/            MatchConfig + PlayerSlot: what the skirmish setup screen produces
    commands/         Command base class and its subclasses (MoveCommand, ...)
  content/            game data as .tres: rules, factions, units, buildings, maps
  match/              GameMatch (runs a skirmish, current run scene) and GameMap (map base script)
  entities/           unit / building / projectile scenes and their node scripts
  systems/<name>/     one folder per gameplay system: camera, commands (CommandDispatcher),
                      selection; later economy, production, combat, fog
  ai/                 computer opponents (issue Commands exactly like the player)
  ui/                 menus/, hud/, match setup screen, shared widgets
  assets/             art, audio, fonts, shaders (human-made; don't generate binaries here)
  tests/              run_tests.gd runner, test_case.gd base, unit/ tests
```

## Architecture rules (keep these)

1. **Data, not code, holds balance.** Unit/building/weapon/faction stats live in `game/content/*.tres`
   as typed Resources. Never hard-code a stat in a script. See `docs/data.md`.
   **Data is in tiles, not pixels** (distances in tiles, speeds in tiles per second). Convert only
   through `Tiles` (`core/tiles.gd`, 32 px per tile).
2. **Cross-references use ids** (`StringName`, e.g. `&"a_worker"`), not resource paths. Ids are
   globally unique, lower_snake_case and prefixed per faction (`a_`, `b_`).
3. **All game-state changes go through `Command` objects** (move, attack, build, train, ...). Player
   input and AI produce the same Commands. This keeps AI fair and makes replays and multiplayer
   possible later.
4. **Rules in `core/` and `systems/` should be testable headlessly.** Prefer plain classes
   (`RefCounted`/`Resource`) for logic and keep Nodes thin (movement, visuals, input). If a rule can't
   be tested without spawning scenes, think about extracting it.
5. **EventBus is for coarse, game-level events** (match started, entity destroyed). Use direct
   signals between nearby nodes.
6. **The game is two factions, but nothing should assume exactly two.** Iterate over
   `GameData.factions()`, don't branch on faction ids.

## GDScript conventions

- Godot style guide: tabs, `snake_case` files/functions/vars, `PascalCase` classes, `CONSTANT_CASE`.
- **Static typing everywhere** (`var hp: int`, `func f(x: float) -> void`). Use typed arrays and
  dictionaries (`Array[StringName]`, `Dictionary[StringName, int]`).
- Give a script `class_name` only if other code refers to it by type.
- Begin each script with a short `##` doc comment saying what it is for.
- One class per file. File name = class name in snake_case.

## Tests

- Tests live in `game/tests/**/test_*.gd`, extend `TestCase`, and use `test_*` methods with
  `assert_*` helpers. A script error inside a test counts as a failure.
- New rules or systems in `core/`/`systems/` get tests. New content is covered by the content
  validation test; extend `core/content_validator.gd` when you add new kinds of references.

## Working agreements

- Don't edit `game/.godot/` (cache) or hand-edit binary files in `assets/`.
- `*.gd.uid` and `*.import` sidecar files are generated by Godot but **are committed**. When you
  move or rename a script or asset, move its sidecar with it (or do the move in the Godot editor).
- `.tscn`/`.tres` are editable text. Keep `ext_resource` ids consistent. Godot adds `uid=` attributes
  when the file is next saved in the editor, which is fine.
- Pathfinding is Godot's built-in navigation (NavigationServer2D, NavigationAgent2D with
  avoidance). Maps bake their navmesh from StaticBody2D obstacles on load (`match/game_map.gd`).
  Keep all movement going through `Unit.move_to()` so the navigation backend can change later.
- Design questions (unit roles, faction identity, numbers) belong to the user: write them as
  open questions in `docs/design.md` instead of inventing answers.
- Update `docs/` when a change alters architecture or data formats. Record significant decisions as
  a new ADR in `docs/decisions/`.
