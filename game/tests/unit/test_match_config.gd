extends TestCase
## Rules for what counts as a playable skirmish setup.

const FACTIONS: Array[StringName] = [&"faction_a", &"faction_b"]


func _one_vs_one() -> MatchConfig:
	var config := MatchConfig.new()
	config.players = [
		PlayerSlot.create(PlayerSlot.Controller.HUMAN, &"faction_a", 0),
		PlayerSlot.create(PlayerSlot.Controller.AI, &"faction_b", 1),
	]
	return config


func test_one_vs_one_is_valid() -> void:
	assert_no_problems(_one_vs_one().validate(FACTIONS))


func test_needs_two_players() -> void:
	var config := _one_vs_one()
	config.players.resize(1)
	assert_has_problem(config.validate(FACTIONS), "at least 2 players")


func test_needs_exactly_one_human() -> void:
	var config := _one_vs_one()
	config.players[1].controller = PlayerSlot.Controller.HUMAN
	assert_has_problem(config.validate(FACTIONS), "Exactly one human")


func test_needs_two_teams() -> void:
	var config := _one_vs_one()
	config.players[1].team = 0
	assert_has_problem(config.validate(FACTIONS), "same team")


func test_unknown_faction() -> void:
	var config := _one_vs_one()
	config.players[1].faction = &"faction_z"
	assert_has_problem(config.validate(FACTIONS), "unknown faction")


func test_free_for_all_with_three_ai_is_valid() -> void:
	var config := _one_vs_one()
	config.players.append(PlayerSlot.create(PlayerSlot.Controller.AI, &"faction_a", 2))
	config.players.append(PlayerSlot.create(PlayerSlot.Controller.AI, &"faction_b", 3))
	assert_no_problems(config.validate(FACTIONS))


func test_real_factions_are_accepted() -> void:
	var ids: Array[StringName] = []
	for f in GameData.factions():
		ids.append(f.id)
	assert_no_problems(_one_vs_one().validate(ids))
