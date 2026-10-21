extends TestCase
## MoveCommand sanity checks and serialization.


func test_valid_command() -> void:
	assert_true(MoveCommand.new(0, [1, 2], Vector2(10, 10)).is_valid())


func test_needs_a_player() -> void:
	assert_false(MoveCommand.new(-1, [1], Vector2.ZERO).is_valid())


func test_needs_units() -> void:
	assert_false(MoveCommand.new(0, [], Vector2.ZERO).is_valid())


func test_to_dict() -> void:
	var command := MoveCommand.new(1, [4, 5], Vector2(3, 4))
	command.tick = 12
	assert_eq(command.to_dict(), {"type": &"move", "player": 1, "tick": 12, "units": [4, 5], "target": [3.0, 4.0]})
