extends TestCase
## Drag-box geometry for unit selection.


func test_drag_rect_from_top_left() -> void:
	assert_eq(SelectionSystem.drag_rect(Vector2(10, 20), Vector2(50, 80)), Rect2(10, 20, 40, 60))


func test_drag_rect_from_bottom_right() -> void:
	assert_eq(SelectionSystem.drag_rect(Vector2(50, 80), Vector2(10, 20)), Rect2(10, 20, 40, 60))
