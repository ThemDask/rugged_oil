class_name MoveCommand
extends Command
## Orders units to move to a world position. The dispatcher spreads a group around the target.

var unit_ids: Array[int] = []
var target: Vector2 = Vector2.ZERO


func _init(p_player_id: int = -1, p_unit_ids: Array[int] = [], p_target: Vector2 = Vector2.ZERO) -> void:
	super(p_player_id)
	unit_ids = p_unit_ids
	target = p_target


func get_type() -> StringName:
	return &"move"


func is_valid() -> bool:
	return super() and not unit_ids.is_empty() and target.is_finite()


func to_dict() -> Dictionary:
	var data := super()
	data["units"] = unit_ids.duplicate()
	data["target"] = [target.x, target.y]
	return data
