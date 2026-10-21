class_name GameMap
extends Node2D
## A playable map: a ground area, obstacles and spawn points. Maps are authored by placing nodes:
## StaticBody2D obstacles (axis-aligned RectangleShape2D) under NavigationRegion2D, and Marker2D
## spawn points under SpawnPoints. The navigation mesh is baked from the obstacles on load.

## Navigation keeps this far from obstacles. Should be at least the largest unit radius.
const NAV_CLEARANCE_TILES := 0.5

@export var size_tiles: Vector2i = Vector2i(64, 40)
@export var ground_color: Color = Color(0.22, 0.3, 0.2)
@export var grid_color: Color = Color(1, 1, 1, 0.05)
@export var obstacle_color: Color = Color(0.36, 0.31, 0.27)

@onready var _navigation: NavigationRegion2D = $NavigationRegion2D
@onready var _spawn_points: Node2D = $SpawnPoints


func _ready() -> void:
	_bake_navigation()


## The playable area in world pixels.
func world_rect() -> Rect2:
	return Rect2(Vector2.ZERO, Vector2(size_tiles * Tiles.SIZE))


func spawn_points() -> Array[Vector2]:
	var points: Array[Vector2] = []
	for marker: Node2D in _spawn_points.get_children():
		points.append(marker.global_position)
	return points


func _bake_navigation() -> void:
	var polygon := NavigationPolygon.new()
	polygon.agent_radius = Tiles.to_px(NAV_CLEARANCE_TILES)
	polygon.parsed_geometry_type = NavigationPolygon.PARSED_GEOMETRY_STATIC_COLLIDERS
	var r := world_rect()
	polygon.add_outline(PackedVector2Array([
		r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y),
	]))
	_navigation.navigation_polygon = polygon
	_navigation.bake_navigation_polygon(false)


func _obstacle_shapes() -> Array[CollisionShape2D]:
	var shapes: Array[CollisionShape2D] = []
	for node in _navigation.find_children("*", "CollisionShape2D", true, false):
		shapes.append(node)
	return shapes


func _draw() -> void:
	var r := world_rect()
	draw_rect(r, ground_color)
	for x in range(0, size_tiles.x + 1):
		draw_line(Vector2(x * Tiles.SIZE, 0), Vector2(x * Tiles.SIZE, r.end.y), grid_color)
	for y in range(0, size_tiles.y + 1):
		draw_line(Vector2(0, y * Tiles.SIZE), Vector2(r.end.x, y * Tiles.SIZE), grid_color)
	for shape in _obstacle_shapes():
		var rect := shape.shape as RectangleShape2D
		if rect:
			draw_rect(Rect2(to_local(shape.global_position) - rect.size / 2.0, rect.size), obstacle_color)
