class_name FactionDef
extends Resource
## Static definition of a playable faction.

@export var id: StringName
@export var display_name: String
@export_multiline var description: String
## Default player color for this faction in the setup screen.
@export var color: Color = Color.WHITE
@export var icon: Texture2D

@export_group("Start")
## Unit ids spawned at match start (repeat an id to spawn several).
@export var starting_units: Array[StringName] = []
## Building ids placed at match start.
@export var starting_buildings: Array[StringName] = []
