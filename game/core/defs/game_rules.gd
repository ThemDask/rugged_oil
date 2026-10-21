class_name GameRules
extends Resource
## Global match rules shared by all factions. Exactly one instance: res://content/rules.tres.

## Every resource a cost may use, e.g. [&"gold"]. (Design TBD, see docs/design.md.)
@export var resource_types: Array[StringName] = []
@export var starting_resources: Dictionary[StringName, int] = {}
@export var supply_cap: int = 200
