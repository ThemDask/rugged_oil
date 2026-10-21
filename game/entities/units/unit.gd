class_name Unit
extends CharacterBody2D
## A unit on the map. setup() configures it from a UnitDef before it enters the tree. It then
## follows NavigationAgent2D paths with avoidance. Until real art exists it draws a placeholder:
## a team-colored circle with a line showing which way it faces.

const SELECTION_COLOR := Color(0.45, 1.0, 0.45)

var def: UnitDef
var entity_id: int = -1
var player_id: int = -1
var team_color: Color = Color.WHITE
var health: int = 0
var selected: bool = false:
	set(value):
		selected = value
		queue_redraw()

var _facing: float = 0.0

@onready var _agent: NavigationAgent2D = $NavigationAgent2D
@onready var _shape: CollisionShape2D = $CollisionShape2D


func setup(p_def: UnitDef, p_entity_id: int, p_player_id: int, p_color: Color) -> void:
	def = p_def
	entity_id = p_entity_id
	player_id = p_player_id
	team_color = p_color
	health = def.max_health


func _ready() -> void:
	(_shape.shape as CircleShape2D).radius = radius_px()
	_agent.radius = radius_px()
	_agent.max_speed = speed_px()
	_agent.target_position = global_position
	_agent.velocity_computed.connect(_on_velocity_computed)


func radius_px() -> float:
	return Tiles.to_px(def.radius)


func speed_px() -> float:
	return Tiles.to_px(def.move_speed)


func move_to(target: Vector2) -> void:
	_agent.target_position = target


func get_move_target() -> Vector2:
	return _agent.target_position


func _physics_process(_delta: float) -> void:
	var desired := Vector2.ZERO
	if not _agent.is_navigation_finished():
		desired = global_position.direction_to(_agent.get_next_path_position()) * speed_px()
	# Avoidance adjusts this and hands it back through velocity_computed.
	_agent.velocity = desired


func _on_velocity_computed(safe_velocity: Vector2) -> void:
	velocity = safe_velocity
	move_and_slide()
	if velocity.length_squared() > 1.0:
		_facing = velocity.angle()
		queue_redraw()


func _draw() -> void:
	var r := radius_px()
	if selected:
		draw_arc(Vector2.ZERO, r + 3.0, 0.0, TAU, 32, SELECTION_COLOR, 2.0)
	draw_circle(Vector2.ZERO, r, team_color)
	draw_circle(Vector2.ZERO, r, Color.BLACK, false, 1.5)
	draw_line(Vector2.ZERO, Vector2.from_angle(_facing) * r, Color.BLACK, 2.0)
	if selected or health < def.max_health:
		_draw_health_bar(r)


func _draw_health_bar(r: float) -> void:
	var bar := Rect2(-r, -r - 8.0, r * 2.0, 4.0)
	draw_rect(bar, Color(0, 0, 0, 0.6))
	bar.size.x *= float(health) / def.max_health
	draw_rect(bar, Color(0.3, 0.9, 0.3))
