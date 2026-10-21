class_name GameMatch
extends Node2D
## Runs one skirmish: loads the map named in the MatchConfig, spawns every player's starting
## units and wires the systems together. Without a config it starts a dev match (human vs one AI).

const UNIT_SCENE := preload("res://entities/units/unit.tscn")
const DEV_MAP := &"test_map"

## Set this before switching to the match scene. It is consumed in _ready.
static var pending_config: MatchConfig

var config: MatchConfig
var map: GameMap
## Index of the human player in config.players.
var human_player: int = -1
## Every live unit, by entity id. Shared with the systems.
var units: Dictionary[int, Unit] = {}

var _next_entity_id: int = 1

@onready var _units_root: Node2D = $Units
@onready var _dispatcher: CommandDispatcher = $CommandDispatcher
@onready var _selection: SelectionSystem = $SelectionSystem
@onready var _camera: RtsCamera = $RtsCamera


func _ready() -> void:
	config = pending_config if pending_config else _dev_config()
	pending_config = null
	if not _load_map():
		return

	var spawns := map.spawn_points()
	for player_id in config.players.size():
		_spawn_starting_units(player_id, spawns[player_id])
		if config.players[player_id].is_human():
			human_player = player_id

	_dispatcher.units = units
	_selection.setup(human_player, units, _dispatcher)
	_camera.bounds = map.world_rect()
	_camera.position = spawns[human_player]
	EventBus.match_started.emit(config)


func spawn_unit(def: UnitDef, player_id: int, at: Vector2) -> Unit:
	var scene := def.scene if def.scene else UNIT_SCENE
	var unit: Unit = scene.instantiate()
	unit.setup(def, _next_entity_id, player_id, config.players[player_id].color)
	unit.position = at
	units[unit.entity_id] = unit
	_next_entity_id += 1
	_units_root.add_child(unit)
	EventBus.entity_spawned.emit(unit)
	return unit


func _load_map() -> bool:
	var faction_ids: Array[StringName] = []
	for f in GameData.factions():
		faction_ids.append(f.id)
	var problems := config.validate(faction_ids)
	var map_def := GameData.map(config.map_id)
	if map_def == null:
		problems.append("Unknown map '%s'." % config.map_id)
	if not problems.is_empty():
		push_error("GameMatch: cannot start:\n  " + "\n  ".join(problems))
		return false

	map = map_def.scene.instantiate()
	add_child(map)
	move_child(map, 0)  # draw below everything else
	if map.spawn_points().size() < config.players.size():
		push_error("GameMatch: map '%s' has fewer spawn points than players." % config.map_id)
		return false
	return true


func _spawn_starting_units(player_id: int, spawn: Vector2) -> void:
	var faction := GameData.faction(config.players[player_id].faction)
	var defs: Array[UnitDef] = []
	var largest := 0.0
	for id in faction.starting_units:
		var def := GameData.unit(id)
		defs.append(def)
		largest = maxf(largest, Tiles.to_px(def.radius))
	var points := Formation.block(spawn, defs.size(), Formation.spacing_for(largest))
	for i in defs.size():
		spawn_unit(defs[i], player_id, points[i])


## Human with the first faction vs one AI with the next.
static func _dev_config() -> MatchConfig:
	var factions := GameData.factions()
	var dev := MatchConfig.new()
	dev.map_id = DEV_MAP
	for i in 2:
		var faction := factions[i % factions.size()]
		var controller := PlayerSlot.Controller.HUMAN if i == 0 else PlayerSlot.Controller.AI
		var slot := PlayerSlot.create(controller, faction.id, i)
		slot.color = faction.color
		dev.players.append(slot)
	return dev
