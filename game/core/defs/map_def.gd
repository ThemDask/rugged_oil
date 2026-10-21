class_name MapDef
extends Resource
## Static definition of a playable map. The scene's root must use the GameMap script.

@export var id: StringName
@export var display_name: String
@export_multiline var description: String
@export var max_players: int = 2
@export var scene: PackedScene
