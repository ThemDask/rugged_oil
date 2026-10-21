class_name EntityDef
extends Resource
## Fields shared by everything a player owns on the map (units and buildings).
## Not used directly: see UnitDef and BuildingDef.

@export var id: StringName
@export var faction: StringName
@export var display_name: String
@export_multiline var description: String
## Free-form labels used for damage bonuses, AI decisions and UI filters, e.g. &"worker".
@export var tags: Array[StringName] = []

@export_group("Cost")
## Resource type -> amount. Keys must be listed in GameRules.resource_types.
@export var cost: Dictionary[StringName, int] = {}
## Seconds to train or construct.
@export var build_time: float = 10.0
## Ids of buildings (or later, techs) that must exist before this can be made.
@export var requires: Array[StringName] = []

@export_group("Stats")
@export var max_health: int = 100
@export var armor: int = 0
@export var sight_range: float = 8.0

@export_group("Combat")
## Embedded sub-resources. Empty for non-combat units and buildings.
@export var weapons: Array[WeaponDef] = []

@export_group("Presentation")
## Overrides the default entity scene for this def's archetype. Leave empty to use the default.
@export var scene: PackedScene
@export var icon: Texture2D
