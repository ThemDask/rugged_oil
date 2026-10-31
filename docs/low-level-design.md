# Low Level Design

How Rugged Oil works under the hood. Written for someone who knows Phaser and TypeScript well but
hasn't built a networked or deterministic game.

**The HLD (`docs/high-level-design.md`) is the source of truth for game rules, names and numbers.** This
document only says how the code implements them. When the two disagree on a rule, the HLD wins
and this document gets fixed.

---

## 1. The general idea

A normal Phaser game keeps its state in sprites and updates it in `update(time, delta)`. We
**don't**. All game state lives in a plain TypeScript object, the **simulation** (`SimWorld`),
which knows nothing about Phaser. It advances in fixed steps ("ticks"), and the only way to
change it is to hand it **Commands** ("move these units there", "recruit a Knight"). Phaser only
**draws** what the simulation says. That split costs a little extra code now, and buys us
multiplayer, replays, a fair AI and fast tests later.

```
 mouse / keyboard      AI          network (later)
        │              │                │
        └──────► Command ◄──────────────┘
                   │
                   ▼
          SimWorld (src/sim/)        ← all game state, no Phaser
                   │ read-only
                   ▼
          Phaser views (src/client/) ← draw sprites, HUD, play sounds
```

---

## 2. A deterministic simulation

**Deterministic** = same starting state + same Commands ⇒ exactly the same game, on every
machine, every time.

Multiplayer will use **lockstep** (as in StarCraft and Age of Empires): players don't send unit
positions to each other, only their Commands. Each computer runs the whole simulation itself.
That's very cheap on bandwidth and handles hundreds of units, but only works if every computer
computes *exactly* the same result. One tiny difference grows until the games no longer match
("desync").

We build it deterministic **from day one**, because retrofitting is nearly impossible. The side
benefits arrive immediately:
- **Replays** are just the match settings + the list of Commands.
- **Tests** can run a whole match in Node in milliseconds and compare results.
- **The AI** plays through the same Commands as the player. Its only advantage (bonus income) is
  a match setting, so it stays deterministic too.

---

## 3. Rules for code in `src/sim/`

Enforced by `tests/architecture.test.ts` where possible.

| Rule | Why | Instead use |
|---|---|---|
| No Phaser, no `src/client` imports | Sim must run in Node and on a server | Plain TS |
| **Integers only** for game state | Float results can differ between machines | Sim units (below) |
| No `Math.sin/cos/atan2/sqrt/pow/random` | Not guaranteed identical everywhere | `sim/math.ts`: `sinFx`, `cosFx`, `atan2Steps`, `isqrt` |
| No `Math.random` | Different on each machine | `world.rng` (seeded mulberry32) |
| No `Date`, `performance.now`, frame `delta` | Time differs per machine | The tick counter |
| Divide with `idiv(a, b)` | `/` gives floats | Integer division, truncates toward 0 (like C) |
| Iterate entities in ascending id | Order affects outcomes | Maps in insertion (= id) order; sort anything from a Set or object keys |
| State is plain data | Easy to hash, copy, save | Interfaces + Maps, no classes hiding state |
| Never remove entities mid-loop | Removing while iterating changes the order | Mark as dead, remove at the end of the tick |

### Units of measure

The HLD writes data in **metres, seconds and degrees**. The sim stores integers:

| Concept | Data (JSON, HLD) | Sim value |
|---|---|---|
| Distance | metres | **1 m = 100 sim units**; **1 tile = 10 m = 1000 sim units** |
| Angle | degrees | **4096 steps = one full turn** (90° = 1024) |
| Fraction | | fixed point, **1024 = 1.0** |
| Time | seconds | ticks, **20 per second** (50 ms each) |
| Speed | m/s | sim units per tick (15 m/s = 75 units/tick) |
| Small per-tick rates (acceleration, turn rate) | m/s², °/s | **fixed point ×1024** per tick, so slow vehicles don't round to zero |
| Rate of fire | shots/s | cooldown in ticks (0.3/s → 67 ticks) |
| Percentages (armour, piercing) | 0–100 | 0–100 |
| Resources, health, damage | whole numbers | whole numbers |

Conversion happens **once, when content is loaded** (`src/data/convert.ts`), with plain
arithmetic and `Math.round`, which are exact everywhere. The rest of the sim never sees metres.

---

## 4. The tick loop

`SimWorld.step()` advances the game by one tick, always in this order:

1. **Commands:** take the Commands scheduled for this tick, sorted by (tick, playerId, sequence).
   Validate each (right shape? owned units? affordable?) and apply it. Invalid ones are dropped,
   identically on every machine.
2. **Economy:** add manpower income (base + requisition points + AI bonus), advance Raiders
   extraction, advance League extractors' loads and drop-offs.
3. **Production and research:** advance the HQ queue timers; spawn finished units; finish
   research.
4. **Requisition points:** update capture progress, ownership and decay.
5. **Visibility:** every few ticks, recompute each player's visibility grid (section 9).
6. **Units**, in id order: orders (section 8), turning, movement, weapon mounts, firing
   (spawning projectiles).
7. **Separation:** push overlapping units apart.
8. **Projectiles**, in id order: move, check hits, apply damage.
9. **Cleanup:** remove dead units and spent projectiles; check whether an HQ died (match end).
10. `tick++`. A **checksum** (FNV hash of the state) can be computed to compare machines.

On the Phaser side, `MatchScene.update()` runs a **fixed-step accumulator**:

```ts
accumulator += delta;                 // real milliseconds since last frame
let steps = 0;
while (accumulator >= TICK_MS && steps < MAX_TICKS_PER_FRAME) {   // 50 ms, max 5
    world.step();
    accumulator -= TICK_MS;
    steps++;
}
const alpha = accumulator / TICK_MS;  // 0..1, how far we are into the next tick
views.forEach(v => v.update(alpha));  // draw smoothly between ticks
```

The sim runs at a steady 20 Hz whatever the frame rate, and views look smooth at 60+ FPS by
**interpolating** each unit's and projectile's previous and current position. (The cap of 5 ticks
per frame stops a slow frame from triggering a death spiral of catch-up work.) When paused (Esc
menu), the loop simply doesn't step.

---

## 5. Sim state

All of it lives in `SimWorld`, as plain data:

```ts
interface SimWorld {
    tick: number;
    rng: SimRng;
    grid: SimGrid;                      // tiles, obstacles, clearance
    players: Map<PlayerId, PlayerState>;
    units: Map<UnitId, SimUnit>;
    projectiles: Map<ProjectileId, SimProjectile>;
    reqPoints: Map<number, SimReqPoint>;
    reserves: Map<number, SimReserve>;
    winner: PlayerId | null;            // set when an HQ dies
    nextId: number;                     // ids are never reused
}
```

| Entity | Key state |
|---|---|
| **PlayerState** | faction, resources (manpower, oil, metal), income bonus (AI), population used, production queue (max 5 entries: unit id, paid cost, remaining ticks), research in progress, researched upgrades, visibility grid |
| **SimUnit** | id, owner, unit def id, position, hull angle, speed, health, path, **order queue**, hold-fire flag, weapon slots (mount angle, cooldown), applied upgrades, extractor load |
| **SimProjectile** | id, owner, position, direction, speed, distance left, damage, piercing |
| **SimReqPoint** | position, capture square, owner, capture progress, capturing side, decay timer |
| **SimReserve** | position, resource (oil/metal), amount left |

`PlayerId`s come from `MatchConfig.players`. Nothing assumes exactly two players or factions.

---

## 6. Commands

Commands are plain objects in `src/sim/commands.ts`:

```ts
{ type: 'move', playerId: 0, unitIds: [3, 4], target: { x: 12000, y: 8000 }, queue: false }
```

| Command | Meaning |
|---|---|
| `move` | Drive to a point |
| `attack` | Attack a specific enemy unit (drive into range if needed) |
| `attackMove` | Drive to a point, fighting visible enemies on the way |
| `capture` | Capture a requisition point |
| `gather` | Extract from a reserve |
| `stop` | Cancel the current and queued orders |
| `holdFire` | Toggle automatic firing |
| `recruit` | Queue a unit at the HQ (pays immediately) |
| `cancelRecruit` | Remove a queued unit (full refund) |
| `research` | Research an upgrade at the HQ |
| `applyUpgrade` | Apply a researched unit upgrade to selected units (pays the apply cost) |

- Order Commands carry `queue: true` when Shift is held: the order is appended instead of
  replacing the current one.
- `world.schedule(cmd)` stamps them with a `tick` and a `sequence` number.
- **Single-player:** `CommandBridge.issue()` schedules for the next tick.
- **Multiplayer (later):** Commands are batched into turns of about 150 ms, sent through a relay
  server, and applied with a 2-turn delay so everyone has them in time.
- The sim **validates** everything: ownership, cost, population cap, queue size, valid target.
  The client may grey out buttons, but the sim has the final word.
- **Never change sim state directly from a scene or view.**

---

## 7. Map, pathfinding and movement

**Map data** (`content/maps/<id>/map.json`): size in tiles (256 × 256), background image key,
obstacles (tile rectangles, each with a sprite key), HQ spawns, requisition points (position) and
reserves (position, resource, amount).

**Grid.** Tiles are blocked or free (`sim/grid.ts`), built from the obstacles.

**Clearance.** For every tile we store how many tiles there are to the nearest obstacle (a
breadth-first search). A big vehicle needs a big clearance, so an HQ won't plan a path through a
gap only a scout fits through.

**A\*.** Standard A* over the grid: 8 directions, no cutting corners past obstacles, octile
distance as the heuristic, a binary heap as the open list. Then **smoothing**: drop waypoints
when there's a straight clear line (Bresenham line check), so units don't zig-zag tile by tile.
A 256 × 256 grid is 65 536 tiles, which A* handles fine for orders given by players.

**Vehicle driving** (`sim/movement.ts`), per tick:
- Turn toward the next waypoint at the unit's rotation speed.
- If the facing is off by **90° or more, pivot in place** (no driving sideways).
- Otherwise drive, with speed scaled by how well it's facing the target.
- Accelerate up to top speed; **brake** in time to stop at the target.
- **Separation:** overlapping units push each other apart. A unit can't push a bigger size class
  (light < medium < heavy < HQ).

**Unit sizes** (HLD appendix, "Unit sizes"): each size class has a default length × width in
metres; a unit's JSON may override it. The code uses them three ways:
- **Movement and separation:** a circle with radius = (length + width) ÷ 4 (light 3 m, medium
  4.5 m, heavy 6 m, HQ 16 m).
- **Pathfinding clearance:** the unit's width, rounded up to whole tiles.
- **Projectile hits:** the real rotated rectangle, so a long vehicle hit from the side is a bigger
  target than from the front.

**Group moves** spread units into a formation block around the target (`sim/formation.ts`).

**Spawning** a recruited unit: try the free spots around the HQ in a fixed order (behind, sides,
front), and take the first one with enough clearance and no unit.

---

## 8. Orders and unit behaviour

Each unit has an **order queue**. The front order is the current one; `stop` clears the queue.

| Order | Behaviour |
|---|---|
| *(none / idle)* | Stays put. Fires at visible enemies in range. Turns toward the closest visible attacker. |
| `move` | Drives to the point. Fires at enemies in range but **never turns** toward them. |
| `attack` | Drives until the target is in range and visible, then stays and fires. Ends when the target dies or is no longer visible. |
| `attackMove` | Drives; when a visible enemy is in range, stops and fights; continues when none is left. |
| `capture` | Drives into the point's capture square and stays. Counts as capturing only while this is the current order. |
| `gather` | **League:** drive to the reserve, load, drive to the HQ, unload, repeat. **Raiders:** drive to the reserve and gather on the spot. Stops (stays put) when the reserve is empty. |

**Targeting** (each tick, per weapon): if the unit has an `attack` target in range, shoot it;
otherwise, unless hold fire is on, pick the **closest visible enemy** in range with a clear line
of fire. A plain loop over enemy units is fine at this scale (about 200 units); a bucket grid can
be added if profiling ever asks for it.

**"Attacked by"**: when a projectile hits a unit, the unit remembers the attacker for a short
time. Idle units use that to turn toward the closest visible attacker. If the attacker is in the
fog, there's no reaction.

---

## 9. Visibility (fog of war)

"Fire at **visible** enemies" is a game rule, so visibility is computed **in the sim**, not just
drawn by the client.

- Each player has a **visibility grid** (one flag per tile).
- Every **5 ticks** (4 times a second) it is rebuilt: for each of the player's units, mark the
  tiles within its spotting range that are in **line of sight**, with obstacles blocking (a
  shadowcasting pass per unit).
- An enemy unit is visible if its tile is visible to the player.
- The client draws a thin grey layer over non-visible tiles and hides enemy units there. The
  minimap shows only visible enemies.

Cost: about 100 units × a 30-tile radius is a few hundred thousand cheap tile checks every 5
ticks, which is fine.

---

## 10. Combat

**Weapons and mounts** are separate data definitions (section 12). Each unit has **weapon
slots** `{ weapon, mount }`. Per slot, the sim stores the mount's angle (relative to the hull) and
the weapon's cooldown.

- A mount turns toward its target at its rotation speed, but only within its **arc**, centred on
  the hull's front (360° for turrets).
- A weapon fires when its cooldown is ready, the target is in range, and the mount points at the
  aim point.
- **Leading the shot:** the aim point is where the target will be when the projectile arrives,
  based on its current position, heading and speed. If the target changes course, the shot can
  miss.

**Projectiles** are sim entities:
- Each tick a projectile moves `speed` sim units along its direction (100 m/s = 500 units/tick).
- **Hit test:** the segment it travelled this tick is checked against every enemy unit's circle
  and against obstacle tiles. The first thing hit stops it. Friendly units are ignored (no
  friendly fire).
- It's removed after its **maximum projectile distance**.
- There is no splash: one projectile damages at most one unit.

**Damage** (integers):

```
piercingPart = idiv(damage × piercing, 100)
rest         = damage − piercingPart
blocked      = idiv(rest × armour, 100)
healthLoss   = piercingPart + rest − blocked
```

**Facing:** the armour used (front, side or rear) comes from the angle between the projectile's
direction and the target's hull angle: front ±45°, rear ±45°, sides otherwise.

**Death:** health ≤ 0 marks the unit dead; it's removed in the cleanup step. Its population is
freed. A League extractor's load is lost. If it was an HQ, `world.winner` is set to the other
player and the match ends.

---

## 11. Economy, production and upgrades

**Resources** are integers per player: manpower, oil, metal (`sim/economy.ts`).

- **Exact fractions:** income that isn't a whole number per tick (10 manpower/s is 0.5 per tick,
  12.5/s with the AI bonus, 15 oil per minute) is kept in `player.carry`, in units of
  1/120 000 of a resource, and credited as soon as it adds up to a whole unit. Nothing is
  rounded away.
- **Manpower** income per second = base income + `incomePerPoint` per held requisition point,
  plus the player's income bonus (the AI's +25%, from `MatchConfig`). The bonus also applies to
  extracted oil and metal.
- **Requisition points** (`sim/capture.ts`): each tick, sum the capture weight (light 1, medium 2,
  heavy 5) of units inside the square **with a capture order**, per side. The heavier side
  progresses at `1 + (weight difference − 1) ÷ 9` per tick (fixed point); equal sides pause.
  Progress made by another side is worn down first, and the owner wears down an attacker's
  progress. An enemy-owned point is first neutralised, then captured. Without capturers,
  progress decays at a quarter of the weight-1 speed for 10 seconds, then drops to zero. A
  capture order ends once the point is held, so queued orders continue.
- **Extraction:** a gather order goes `toReserve` → `extracting` (inside the reserve's square)
  → for hauling extractors `toHq` and back. Rates are per minute, accumulated exactly per
  extractor. **Raiders** extractors credit each whole unit straight to the player. **League**
  extractors fill their load up to `maxLoad`, then drive to the HQ (re-aiming every 2 s, as the
  HQ may move) and deliver on touching it. A hauler that dies loses its load. When a reserve
  runs out, extractors stop where they are; a hauler first delivers what it carries.

**Production** (`sim/production.ts`): the HQ has one queue (max 5). `recruit` checks the
faction's unit list, resources, queue size and population (queued units count) and pays
immediately; the front entry counts down; when it reaches zero, the unit spawns next to the HQ,
clear of its footprint, trying behind it first, then the sides, then the front (it waits if all
spots are blocked). `cancelRecruit` refunds the full cost. The HUD shows the queue above the
advanced actions while the HQ is selected; clicking an entry cancels it.

**Upgrades** are data with a small, fixed set of effect types, so no upgrade needs its own code:

| Effect | Example |
|---|---|
| `addArmour` | Brace: +10 on all sides |
| `addStat` | Faster, Faster!: +10 top speed, +0.5 acceleration |
| `addWeapon` | Aggressive recon: +1 autocannon |
| `replaceWeapon` | Knightly Vows: Peacemaker → Pacifier |

Each upgrade says what it applies to (a unit type or the whole faction), its research cost and
time, and its apply mode: **automatic** (active for all current and future units once researched)
or **per unit** (with an apply cost, through `applyUpgrade`).

A unit's **effective stats** = its base definition + the effects of its automatic and applied
upgrades. They're recalculated when an upgrade becomes active, not every tick.

---

## 12. Game data (content)

Balance and content are **data, not code**. Everything is JSON in `content/`, typed in
`src/data/types.ts`, bundled by Vite at build time, and written in **HLD units** (metres,
seconds, degrees), so the HLD appendix tables copy straight into it.

```
content/
  rules.json                    resources, starting manpower, base income, population cap,
                                capture times, weights and area size (80 m),
                                requisition income, reserve size (60 m) and amounts,
                                size classes (length, width, population, capture weight)
  weapons/*.json                WeaponDef: damage, piercing, range, rate of fire,
                                projectile speed, max projectile distance
  mounts/*.json                 MountDef: arc, rotation speed
  factions/league/
    faction.json                FactionDef: name, colour, HQ unit
    units/*.json                UnitDef: stats, size class, cost, recruit time,
                                weapon slots {weapon, mount}, extraction rates (extractors)
    upgrades/*.json             UpgradeDef: applies to, effects, costs, research time, apply mode
  factions/raiders/             same structure
  maps/<id>/map.json            MapDef: size, background, obstacles, spawns,
                                requisition points, reserves
```

- Every file has a `type` field (`rules`, `faction`, `unit`, `weapon`, `mount`, `upgrade`,
  `map`). Folders are only for humans.
- Ids are unique, lower_snake_case and prefixed per faction: `league_knight`,
  `raiders_destroyer`. Shared things have no prefix: `autocannon`, `turret`.
- Names follow the HLD (manpower, oil, metal, HQ, extractor, requisition point…).
- `src/data/validate.ts` checks: exactly one HQ per faction; every reference (weapon, mount,
  upgrade target) exists; costs use declared resources; numbers are in range (percentages
  0–100, speeds > 0); map spawns, points and reserves are inside the map and not in obstacles.
- `src/data/convert.ts` turns the HLD units into sim integers once, at load.
- `GameData` (`src/data/registry.ts`) is the lookup used by everyone.

**Never hard-code a stat in TypeScript.** Add a field to the JSON and its type instead.

---

## 13. Phaser side (`src/client/`)

| Part | What it does |
|---|---|
| `main.ts` | Creates the `Phaser.Game` (RESIZE scale mode) and registers the scenes |
| `scenes/` | Boot → MainMenu → MatchSetup → Match; EndScreen overlay |
| `views/UnitView.ts` | One per unit: sprite, team colour, selection rectangle, order indicator line. Interpolates, **never writes** |
| `views/ProjectileView.ts` | One per projectile, interpolated |
| `views/MapView.ts` | Background, obstacles, requisition points, reserves |
| `views/FogView.ts` | The thin grey layer over non-visible tiles |
| `systems/RtsCamera.ts` | WASD, edge scroll, wheel zoom |
| `systems/Selection.ts` | Click and box select, Shift to add, control groups |
| `systems/Orders.ts` | Right-click → the right Command (move, attack, capture, gather); Shift → queued |
| `systems/CommandBridge.ts` | The only door from input into the sim |
| `scenes/HudScene.ts` + `hud/` | The HUD: top bar, unit inspector, action buttons, minimap (see below) |
| `placeholders.ts` | Generates placeholder textures under their final keys and sizes, only for art not loaded in `BootScene.preload()` |
| `views/MapObjectsView.ts` | Requisition points (flag tinted by owner, capture square) and reserves |
| `scale.ts` | `TILE_SIZE = 32` px and sim ↔ pixel conversion |
| `settings.ts` | Player settings in `localStorage` |

- **Placeholder art:** until the real 2D art arrives, every unit, projectile, reserve, requisition
  point, obstacle and HUD symbol uses a code-drawn or simple placeholder with the **same texture
  key, size and orientation (facing right = angle 0)** the real art will have. Swapping in the art
  is then a file change in `public/assets/` and `BootScene.preload()`, with no other code changes.
- **Scale:** 1 tile = 10 m = 32 px. This is visual only. Changing it never changes gameplay.
- **The HUD is its own Phaser scene** (`HudScene`), running on top of the Match scene with its own
  camera, so the match zoom never scales it. Its parts (top bar, inspector, action grids) are
  small classes in `hud/` built from Phaser Graphics (thin light-blue lines) and Text. It reads sim
  state every frame and sends Commands through `CommandBridge`, like any other input. Clicks on
  the HUD must not fall through to the map: the Match scene ignores pointer events over HUD areas.
- **Minimap:** a second camera on the Match scene with a very low zoom, drawn into the HUD's
  corner, or a small Graphics redrawn a few times per second from sim state (obstacles, reserves,
  points, own units, visible enemies). Clicking it moves the camera.
- **Esc** opens the escape menu and pauses single-player; Esc again closes it.
- **Match end:** when `world.winner` is set, the Match scene shows the victory or defeat screen;
  Exit goes back to the main menu.

Scene flow:

```
Boot ──► MainMenu ──► MatchSetup ──► Match (+ HudScene)
            ▲            │ Back        │ Esc → Exit, or victory/defeat → Exit
            └────────────┴─────────────┘
```

---

## 14. AI (`src/ai/`)

- `AiController.think(world, playerId)` reads the sim and returns Commands. It runs a few times
  per second, not every tick.
- It uses **only** Commands, like the player. Its cheat (bonus income) is a `MatchConfig` value
  that the sim applies, so it stays deterministic.
- It plays the whole loop: recruit extractors and gather, capture requisition points, build an
  army, attack the player's HQ.
- **AI vision:** for simplicity the AI may read the whole sim, but it should only *target* what
  it can see, since the sim's targeting rules already enforce visibility.

---

## 15. Folders and who may import what

| Folder | Contains | Phaser? |
|---|---|---|
| `src/sim/` | Game state and rules | **No** |
| `src/data/` | Content types, registry, validator, unit conversion | **No** |
| `src/setup/` | `MatchConfig` (map, players and factions, AI bonus, seed) | **No** |
| `src/ai/` | AI: reads the sim, returns Commands | **No** |
| `src/client/` | Everything you see and click | Yes |
| `content/` | JSON game data | n/a |
| `tests/` | Vitest, runs in Node | No |

`MatchConfig` + `GameData` → `createWorld()` (`sim/setup.ts`) → a ready `SimWorld`.

Suggested sim files as the game grows: `world.ts`, `commands.ts`, `grid.ts`, `movement.ts`,
`formation.ts`, `orders.ts`, `visibility.ts`, `combat.ts`, `projectiles.ts`, `economy.ts`,
`capture.ts`, `production.ts`, `upgrades.ts`, `math.ts`, `rng.ts`. Each is a set of functions
over `SimWorld`, called by `step()` in the order of section 4. Until a system is implemented,
its empty step function lives in `sim/systems.ts`; it moves to its own file when its milestone
builds it.

---

## 16. Testing

`npm test` (Vitest, Node) and `npm run typecheck` after every change.

- **Unit tests** for each sim system: maths, grid/A*, movement, capture, economy, production,
  upgrades, damage and facing, projectile hits, visibility.
- **Content test:** all JSON is valid, and the validator catches each kind of mistake.
- **Determinism test:** runs a scripted match twice (recruiting, capturing, fighting) and
  requires identical checksums every tick. If this breaks, something non-deterministic crept in.
- **Architecture test:** scans `src/sim`, `src/data`, `src/setup`, `src/ai` for Phaser imports
  and banned APIs.
- **AI smoke test:** AI vs AI for a few thousand ticks without errors, and someone wins or the
  match keeps progressing.
- The client is checked by typecheck, build and playing it (`npm run dev`).

---

## 17. Checklist: adding a feature

1. Read the HLD rule. Data first: add fields to `src/data/types.ts` and the JSON (HLD units),
   convert them in `convert.ts`, extend `validate.ts` if new references appear.
2. A new **Command** type if players or the AI trigger it.
3. Sim logic in `src/sim/`, integers only, called from `step()` in the right place, with unit
   tests.
4. A view or HUD part in `src/client/` that only **reads** the sim.
5. `npm test` + `npm run typecheck` (the determinism test must stay green).
6. Update this document if the architecture or data format changed.
