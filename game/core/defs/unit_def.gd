class_name UnitDef
extends EntityDef
## Static definition of a unit type.

@export_group("Movement")
## Tiles per second.
@export var move_speed: float = 4.0
## Body size in tiles, used for collision, avoidance and selection.
@export var radius: float = 0.4

@export_group("Supply")
@export var supply: int = 1
