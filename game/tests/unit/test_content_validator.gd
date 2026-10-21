extends TestCase
## Checks that ContentValidator catches broken data, using small in-memory fixtures.

var rules: GameRules
var faction: FactionDef
var hq: BuildingDef
var worker: UnitDef


func before_each() -> void:
	rules = GameRules.new()
	rules.resource_types = [&"gold"]

	faction = FactionDef.new()
	faction.id = &"f"
	faction.display_name = "F"
	faction.starting_buildings = [&"f_hq"]

	hq = BuildingDef.new()
	hq.id = &"f_hq"
	hq.faction = &"f"
	hq.display_name = "HQ"
	hq.produces = [&"f_worker"]

	worker = UnitDef.new()
	worker.id = &"f_worker"
	worker.faction = &"f"
	worker.display_name = "Worker"
	worker.cost = {&"gold": 50}


func _validate() -> PackedStringArray:
	return ContentValidator.validate(rules, [faction], [worker], [hq])


func test_valid_fixture_passes() -> void:
	assert_no_problems(_validate())


func test_missing_rules() -> void:
	assert_has_problem(ContentValidator.validate(null, [], [], []), "GameRules")


func test_unknown_faction() -> void:
	worker.faction = &"nope"
	assert_has_problem(_validate(), "unknown faction 'nope'")


func test_undeclared_resource() -> void:
	worker.cost = {&"oil": 10}
	assert_has_problem(_validate(), "undeclared resource 'oil'")


func test_unknown_requirement() -> void:
	worker.requires = [&"f_barracks"]
	assert_has_problem(_validate(), "requires unknown id 'f_barracks'")


func test_produces_non_unit() -> void:
	hq.produces = [&"f_hq"]
	assert_has_problem(_validate(), "not a known unit")


func test_starting_building_from_other_faction() -> void:
	hq.faction = &"other"
	assert_has_problem(_validate(), "from faction 'other'")


func test_bad_weapon() -> void:
	var w := WeaponDef.new()
	w.display_name = "Broken"
	w.range = 0.0
	worker.weapons = [w]
	assert_has_problem(_validate(), "needs range > 0")


func test_map_without_scene() -> void:
	var map := MapDef.new()
	map.id = &"m"
	map.display_name = "M"
	assert_has_problem(ContentValidator.validate(rules, [faction], [worker], [hq], [map]), "has no scene")


func test_non_positive_health() -> void:
	worker.max_health = 0
	assert_has_problem(_validate(), "max_health")
