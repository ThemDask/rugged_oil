class_name WeaponDef
extends Resource
## A weapon mounted on a unit or building. Embedded as a sub-resource in its owner's .tres.

@export var display_name: String
@export var damage: int = 10
@export var range: float = 5.0
## Seconds between shots.
@export var cooldown: float = 1.0
## 0 = single target.
@export var splash_radius: float = 0.0
## 0 = instant hit; otherwise a projectile travels at this speed.
@export var projectile_speed: float = 0.0
## Target tag -> damage multiplier, e.g. {&"armored": 1.5}.
@export var bonus_vs_tags: Dictionary[StringName, float] = {}
