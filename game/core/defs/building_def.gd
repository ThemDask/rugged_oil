class_name BuildingDef
extends EntityDef
## Static definition of a building type.

@export_group("Placement")
## Size in map grid cells.
@export var footprint: Vector2i = Vector2i(2, 2)

@export_group("Function")
## Unit ids this building can train (must belong to the same faction).
@export var produces: Array[StringName] = []
@export var provides_supply: int = 0
## Workers can return gathered resources here.
@export var is_dropoff: bool = false
