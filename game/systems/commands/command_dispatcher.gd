class_name CommandDispatcher
extends Node
## Validates and executes Commands. The human player's input and the AI both go through here,
## and a command only ever affects units owned by the player who issued it.

## Entity id -> unit. Shared with (and filled by) the match.
var units: Dictionary[int, Unit] = {}


func issue(command: Command) -> void:
	if not command.is_valid():
		push_warning("CommandDispatcher: ignoring invalid command %s" % command.to_dict())
		return
	match command.get_type():
		&"move":
			_move(command as MoveCommand)
		_:
			push_error("CommandDispatcher: no handler for command '%s'" % command.get_type())
			return
	EventBus.command_issued.emit(command)


## The units from [param ids] that exist and belong to [param player_id].
func owned_units(ids: Array[int], player_id: int) -> Array[Unit]:
	var result: Array[Unit] = []
	for id in ids:
		var unit: Unit = units.get(id)
		if unit != null and unit.player_id == player_id:
			result.append(unit)
	return result


func _move(command: MoveCommand) -> void:
	var group := owned_units(command.unit_ids, command.player_id)
	if group.is_empty():
		return
	var largest := 0.0
	for unit in group:
		largest = maxf(largest, unit.radius_px())
	var targets := Formation.block(command.target, group.size(), Formation.spacing_for(largest))
	for i in group.size():
		group[i].move_to(targets[i])
