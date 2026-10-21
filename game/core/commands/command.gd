class_name Command
extends RefCounted
## Base class for every action that changes game state (move, attack, build, train, ...).
## Human input and AI controllers both produce Commands, and systems execute them.
## Keep subclasses data-only and serializable so they can be logged for replays.

## Index of the issuing player in MatchConfig.players.
var player_id: int = -1
## Simulation tick the command is applied on (set by whoever schedules it).
var tick: int = 0


func _init(p_player_id: int = -1) -> void:
	player_id = p_player_id


## Short stable name used in logs and replays, e.g. &"move".
func get_type() -> StringName:
	return &""


## Serializable form for replays. Subclasses extend the dictionary with their own fields.
func to_dict() -> Dictionary:
	return {"type": get_type(), "player": player_id, "tick": tick}
