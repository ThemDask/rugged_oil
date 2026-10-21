class_name ContentValidator
extends RefCounted
## Checks the static game data for broken references and nonsense values. Run by the test suite,
## so a bad edit to any .tres fails the tests with a readable message.


static func validate(rules: GameRules, factions: Array, units: Array, buildings: Array, maps: Array = []) -> PackedStringArray:
	var problems := PackedStringArray()
	if rules == null:
		problems.append("No GameRules resource found (expected res://content/rules.tres).")
		return problems

	var faction_ids: Dictionary[StringName, FactionDef] = {}
	for f: FactionDef in factions:
		faction_ids[f.id] = f
	var entities: Dictionary[StringName, EntityDef] = {}
	for e: EntityDef in units + buildings:
		entities[e.id] = e

	for f: FactionDef in factions:
		var where := "Faction '%s'" % f.id
		_check_name(problems, where, f.display_name)
		for list_name: String in ["starting_units", "starting_buildings"]:
			for id: StringName in f.get(list_name):
				var e: EntityDef = entities.get(id)
				if e == null:
					problems.append("%s: %s references unknown id '%s'." % [where, list_name, id])
				elif e.faction != f.id:
					problems.append("%s: %s includes '%s' from faction '%s'." % [where, list_name, id, e.faction])

	for e: EntityDef in entities.values():
		var where := "%s '%s' (%s)" % [e.get_script().get_global_name(), e.id, e.resource_path]
		_check_name(problems, where, e.display_name)
		if not faction_ids.has(e.faction):
			problems.append("%s: unknown faction '%s'." % [where, e.faction])
		if e.max_health <= 0:
			problems.append("%s: max_health must be > 0." % where)
		if e.build_time <= 0.0:
			problems.append("%s: build_time must be > 0." % where)
		for res_type: StringName in e.cost:
			if res_type not in rules.resource_types:
				problems.append("%s: cost uses undeclared resource '%s'." % [where, res_type])
			elif e.cost[res_type] < 0:
				problems.append("%s: negative cost for '%s'." % [where, res_type])
		for id: StringName in e.requires:
			if not entities.has(id):
				problems.append("%s: requires unknown id '%s'." % [where, id])
		for w: WeaponDef in e.weapons:
			_check_weapon(problems, where, w)

	for b: BuildingDef in buildings:
		for id: StringName in b.produces:
			var e: EntityDef = entities.get(id)
			if not e is UnitDef:
				problems.append("Building '%s': produces '%s', which is not a known unit." % [b.id, id])
			elif e.faction != b.faction:
				problems.append("Building '%s': produces '%s' from another faction." % [b.id, id])

	for u: UnitDef in units:
		if u.radius <= 0.0:
			problems.append("Unit '%s': radius must be > 0." % u.id)

	for m: MapDef in maps:
		var where := "Map '%s'" % m.id
		_check_name(problems, where, m.display_name)
		if m.scene == null:
			problems.append("%s: has no scene." % where)
		if m.max_players < 2:
			problems.append("%s: max_players must be at least 2." % where)

	return problems


static func _check_name(problems: PackedStringArray, where: String, display_name: String) -> void:
	if display_name.strip_edges().is_empty():
		problems.append("%s: display_name is empty." % where)


static func _check_weapon(problems: PackedStringArray, where: String, w: WeaponDef) -> void:
	if w == null:
		problems.append("%s: has an empty weapon slot." % where)
		return
	if w.damage < 0:
		problems.append("%s: weapon '%s' has negative damage." % [where, w.display_name])
	if w.range <= 0.0:
		problems.append("%s: weapon '%s' needs range > 0." % [where, w.display_name])
	if w.cooldown <= 0.0:
		problems.append("%s: weapon '%s' needs cooldown > 0." % [where, w.display_name])
