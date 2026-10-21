extends TestCase
## Commands only affect units owned by the player who issued them.

const UNIT_SCENE := preload("res://entities/units/unit.tscn")
const TARGET := Vector2(500, 500)

var root: Node2D
var dispatcher: CommandDispatcher


func before_each() -> void:
	root = Node2D.new()
	tree.root.add_child(root)
	dispatcher = CommandDispatcher.new()
	root.add_child(dispatcher)
	_add_unit(1, 0, Vector2(0, 0))
	_add_unit(2, 0, Vector2(50, 0))
	_add_unit(3, 1, Vector2(100, 0))


func after_each() -> void:
	root.free()


func _add_unit(id: int, player_id: int, at: Vector2) -> void:
	var unit: Unit = UNIT_SCENE.instantiate()
	unit.setup(GameData.unit(&"a_worker"), id, player_id, Color.WHITE)
	unit.position = at
	dispatcher.units[id] = unit
	root.add_child(unit)


func _target_of(id: int) -> Vector2:
	return dispatcher.units[id].get_move_target()


func test_moves_own_units_near_the_target() -> void:
	dispatcher.issue(MoveCommand.new(0, [1, 2], TARGET))
	assert_true(_target_of(1).distance_to(TARGET) < Tiles.SIZE, "unit 1")
	assert_true(_target_of(2).distance_to(TARGET) < Tiles.SIZE, "unit 2")


func test_group_gets_separate_targets() -> void:
	dispatcher.issue(MoveCommand.new(0, [1, 2], TARGET))
	assert_ne(_target_of(1), _target_of(2))


func test_ignores_other_players_units() -> void:
	dispatcher.issue(MoveCommand.new(0, [1, 3], TARGET))
	assert_eq(_target_of(3), Vector2(100, 0))


func test_unknown_ids_are_skipped() -> void:
	assert_eq(dispatcher.owned_units([1, 99], 0).size(), 1)
