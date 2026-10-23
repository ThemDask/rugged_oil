extends TestCase
## Validates the real game data in res://content. Fails on any broken reference or bad stat.


func test_content_is_valid() -> void:
	assert_no_problems(GameData.validate())


func test_rules_are_loaded() -> void:
	assert_not_null(GameData.rules)
	assert_false(GameData.rules.resource_types.is_empty(), "resource_types")


func test_there_is_a_faction() -> void:
	assert_false(GameData.factions().is_empty())


func test_rules_have_the_three_resources() -> void:
	for res_type: StringName in [&"workforce", &"oil", &"metal"]:
		assert_true(res_type in GameData.rules.resource_types, String(res_type))


func test_every_faction_can_start_a_match() -> void:
	for f in GameData.factions():
		assert_false(f.starting_buildings.is_empty(), "%s starting_buildings" % f.id)
		assert_false(GameData.units_of(f.id).is_empty(), "%s has units" % f.id)


func test_lookup_by_id() -> void:
	assert_eq(GameData.unit(&"a_worker").display_name, "Worker")
	assert_eq(GameData.entity(&"a_hq").display_name, "Headquarters")
	assert_null(GameData.unit(&"does_not_exist"))


func test_test_map_loads() -> void:
	var map := GameData.map(&"test_map")
	assert_not_null(map)
	assert_not_null(map.scene)


func test_weapons_load_as_sub_resources() -> void:
	var buggy := GameData.unit(&"a_buggy")
	assert_eq(buggy.weapons.size(), 1)
	assert_true(buggy.weapons[0].damage > 0)
