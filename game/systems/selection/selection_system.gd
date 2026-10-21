class_name SelectionSystem
extends Node2D
## Mouse control for the human player. Left-click selects a unit, left-drag selects with a box,
## Shift adds to the selection. Right-click sends the selection a MoveCommand.
## Only the player's own units can be selected.

signal selection_changed(selected: Array[Unit])

## A left-button drag shorter than this (screen pixels) counts as a click.
const CLICK_MAX_DRAG := 6.0
const BOX_FILL := Color(0.45, 1.0, 0.45, 0.12)
const BOX_LINE := Color(0.45, 1.0, 0.45, 0.8)

var player_id: int = -1
var selected: Array[Unit] = []

var _units: Dictionary[int, Unit] = {}
var _dispatcher: CommandDispatcher
var _dragging: bool = false
var _drag_start_world: Vector2 = Vector2.ZERO
var _drag_start_screen: Vector2 = Vector2.ZERO


func setup(p_player_id: int, units: Dictionary[int, Unit], dispatcher: CommandDispatcher) -> void:
	player_id = p_player_id
	_units = units
	_dispatcher = dispatcher


## The rectangle spanned by two corner points, in any order.
static func drag_rect(a: Vector2, b: Vector2) -> Rect2:
	return Rect2(a, Vector2.ZERO).expand(b)


func _unhandled_input(event: InputEvent) -> void:
	var button := event as InputEventMouseButton
	if button and button.button_index == MOUSE_BUTTON_LEFT:
		if button.pressed:
			_dragging = true
			_drag_start_world = get_global_mouse_position()
			_drag_start_screen = button.position
		elif _dragging:
			_dragging = false
			_finish_selection(button.position.distance_to(_drag_start_screen) < CLICK_MAX_DRAG, button.shift_pressed)
			queue_redraw()
	elif button and button.button_index == MOUSE_BUTTON_RIGHT and button.pressed:
		_order_move(get_global_mouse_position())
	elif event is InputEventMouseMotion and _dragging:
		queue_redraw()


func _finish_selection(is_click: bool, add: bool) -> void:
	var picked: Array[Unit] = []
	if is_click:
		var unit := _own_unit_at(get_global_mouse_position())
		if unit:
			picked.append(unit)
	else:
		var box := drag_rect(_drag_start_world, get_global_mouse_position())
		for unit in _own_units():
			if box.has_point(unit.global_position):
				picked.append(unit)

	if not add:
		for unit in selected:
			unit.selected = false
		selected.clear()
	for unit in picked:
		if unit not in selected:
			unit.selected = true
			selected.append(unit)
	selection_changed.emit(selected)


func _order_move(target: Vector2) -> void:
	if selected.is_empty():
		return
	var ids: Array[int] = []
	for unit in selected:
		ids.append(unit.entity_id)
	_dispatcher.issue(MoveCommand.new(player_id, ids, target))


func _own_units() -> Array[Unit]:
	var result: Array[Unit] = []
	for unit in _units.values():
		if unit.player_id == player_id:
			result.append(unit)
	return result


func _own_unit_at(point: Vector2) -> Unit:
	var best: Unit = null
	var best_distance := INF
	for unit in _own_units():
		var distance := unit.global_position.distance_to(point)
		if distance <= unit.radius_px() + 2.0 and distance < best_distance:
			best = unit
			best_distance = distance
	return best


func _draw() -> void:
	if not _dragging:
		return
	if get_viewport().get_mouse_position().distance_to(_drag_start_screen) < CLICK_MAX_DRAG:
		return
	var box := drag_rect(_drag_start_world, get_global_mouse_position())
	draw_rect(box, BOX_FILL)
	draw_rect(box, BOX_LINE, false, 1.0)
