extends TestCase
## Smoke test: the dev match loads its map and spawns every player's starting units.

const MATCH_SCENE := preload("res://match/game_match.tscn")


func test_dev_match_starts() -> void:
	var game: GameMatch = MATCH_SCENE.instantiate()
	tree.root.add_child(game)
	await tree.physics_frame

	var expected := 0
	for slot in game.config.players:
		expected += GameData.faction(slot.faction).starting_units.size()
	assert_not_null(game.map, "map")
	assert_eq(game.human_player, 0)
	assert_eq(game.units.size(), expected)
	game.free()
