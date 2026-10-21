class_name RtsCamera
extends Camera2D
## Top-down RTS camera: pan with WASD/arrows, screen edges or middle-mouse drag, zoom toward the
## cursor with the mouse wheel. Stays inside [member bounds] (world pixels) once that is set.

## Screen pixels per second; panning feels the same at every zoom level.
@export var pan_speed: float = 900.0
@export var edge_scroll: bool = true
## Distance from the window edge (screen pixels) that triggers edge scrolling.
@export var edge_margin: int = 12
@export var zoom_min: float = 0.5
@export var zoom_max: float = 2.0
@export var zoom_step: float = 1.1

var bounds: Rect2 = Rect2()

var _dragging: bool = false


func _process(delta: float) -> void:
	var direction := Input.get_vector(&"camera_left", &"camera_right", &"camera_up", &"camera_down")
	if direction == Vector2.ZERO and edge_scroll:
		direction = _edge_direction()
	if direction != Vector2.ZERO:
		position += direction * pan_speed * delta / zoom.x
		_clamp()


func _unhandled_input(event: InputEvent) -> void:
	var button := event as InputEventMouseButton
	if button:
		match button.button_index:
			MOUSE_BUTTON_WHEEL_UP:
				if button.pressed:
					_zoom_toward_mouse(zoom_step)
			MOUSE_BUTTON_WHEEL_DOWN:
				if button.pressed:
					_zoom_toward_mouse(1.0 / zoom_step)
			MOUSE_BUTTON_MIDDLE:
				_dragging = button.pressed
	elif event is InputEventMouseMotion and _dragging:
		position -= (event as InputEventMouseMotion).relative / zoom.x
		_clamp()


## Where the camera center must be so a view of [param view_size] stays inside [param area].
## On an axis where the view is larger than the area, the area is centered instead.
static func clamp_center(center: Vector2, view_size: Vector2, area: Rect2) -> Vector2:
	var half := view_size / 2.0
	var result := center
	for axis in 2:
		if view_size[axis] >= area.size[axis]:
			result[axis] = area.get_center()[axis]
		else:
			result[axis] = clampf(center[axis], area.position[axis] + half[axis], area.end[axis] - half[axis])
	return result


func _zoom_toward_mouse(factor: float) -> void:
	var new_zoom := clampf(zoom.x * factor, zoom_min, zoom_max)
	# Keep the world point under the cursor fixed while zooming.
	var offset := get_viewport().get_mouse_position() - get_viewport_rect().size / 2.0
	position += offset / zoom.x - offset / new_zoom
	zoom = Vector2(new_zoom, new_zoom)
	_clamp()


func _edge_direction() -> Vector2:
	var view := get_viewport_rect().size
	var mouse := get_viewport().get_mouse_position()
	if not get_window().has_focus() or not Rect2(Vector2.ZERO, view).has_point(mouse):
		return Vector2.ZERO
	var direction := Vector2.ZERO
	if mouse.x < edge_margin:
		direction.x = -1.0
	elif mouse.x > view.x - edge_margin:
		direction.x = 1.0
	if mouse.y < edge_margin:
		direction.y = -1.0
	elif mouse.y > view.y - edge_margin:
		direction.y = 1.0
	return direction.normalized()


func _clamp() -> void:
	if bounds.has_area():
		position = clamp_center(position, get_viewport_rect().size / zoom, bounds)
