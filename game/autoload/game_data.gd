extends Node
## Read-only registry of all static game data. Scans res://content recursively at startup and
## indexes every definition by id. Usage: GameData.unit(&"a_worker"), GameData.factions().

const CONTENT_ROOT := "res://content"

var rules: GameRules

var _factions: Dictionary[StringName, FactionDef] = {}
var _units: Dictionary[StringName, UnitDef] = {}
var _buildings: Dictionary[StringName, BuildingDef] = {}
var _maps: Dictionary[StringName, MapDef] = {}


func _ready() -> void:
	load_all()


## (Re)loads every definition under [param root]. Duplicate ids are reported and skipped.
func load_all(root: String = CONTENT_ROOT) -> void:
	rules = null
	_factions.clear()
	_units.clear()
	_buildings.clear()
	_maps.clear()

	for path in _find_resource_files(root):
		var res := load(path)
		if res is GameRules:
			if rules != null:
				push_error("GameData: more than one GameRules found (%s)" % path)
			rules = res
		elif res is FactionDef:
			_register(_factions, res, path)
		elif res is UnitDef:
			_register(_units, res, path)
		elif res is BuildingDef:
			_register(_buildings, res, path)
		elif res is MapDef:
			_register(_maps, res, path)


## Returns a list of human-readable problems with the loaded content (empty = valid).
func validate() -> PackedStringArray:
	return ContentValidator.validate(rules, _factions.values(), _units.values(), _buildings.values(), _maps.values())


func faction(id: StringName) -> FactionDef:
	return _factions.get(id)


func unit(id: StringName) -> UnitDef:
	return _units.get(id)


func building(id: StringName) -> BuildingDef:
	return _buildings.get(id)


## Any unit or building with this id, or null.
func entity(id: StringName) -> EntityDef:
	if _units.has(id):
		return _units[id]
	return _buildings.get(id)


func map(id: StringName) -> MapDef:
	return _maps.get(id)


func maps() -> Array[MapDef]:
	return _maps.values()


func factions() -> Array[FactionDef]:
	return _factions.values()


func units_of(faction_id: StringName) -> Array[UnitDef]:
	return _units.values().filter(func(d: UnitDef) -> bool: return d.faction == faction_id)


func buildings_of(faction_id: StringName) -> Array[BuildingDef]:
	return _buildings.values().filter(func(d: BuildingDef) -> bool: return d.faction == faction_id)


func _register(table: Dictionary, def: Resource, path: String) -> void:
	var id: StringName = def.get(&"id")
	if id == &"":
		push_error("GameData: definition without id: %s" % path)
		return
	if table.has(id):
		push_error("GameData: duplicate id '%s' in %s (first: %s)" % [id, path, table[id].resource_path])
		return
	table[id] = def


## Recursively lists .tres/.res files. Handles the ".remap" names used in exported builds.
static func _find_resource_files(dir_path: String) -> PackedStringArray:
	var out := PackedStringArray()
	var dir := DirAccess.open(dir_path)
	if dir == null:
		push_error("GameData: cannot open %s" % dir_path)
		return out
	for sub in dir.get_directories():
		out.append_array(_find_resource_files(dir_path.path_join(sub)))
	for file in dir.get_files():
		file = file.trim_suffix(".remap")
		if file.get_extension() in ["tres", "res"]:
			out.append(dir_path.path_join(file))
	return out
