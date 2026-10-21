extends TestCase
## The camera never shows anything outside the map.

const AREA := Rect2(0, 0, 1000, 800)
const VIEW := Vector2(200, 100)


func test_center_inside_is_unchanged() -> void:
	assert_eq(RtsCamera.clamp_center(Vector2(500, 400), VIEW, AREA), Vector2(500, 400))


func test_clamps_at_the_top_left() -> void:
	assert_eq(RtsCamera.clamp_center(Vector2(-300, 10), VIEW, AREA), Vector2(100, 50))


func test_clamps_at_the_bottom_right() -> void:
	assert_eq(RtsCamera.clamp_center(Vector2(5000, 5000), VIEW, AREA), Vector2(900, 750))


func test_view_wider_than_map_is_centered() -> void:
	assert_eq(RtsCamera.clamp_center(Vector2(0, 400), Vector2(1200, 100), AREA), Vector2(500, 400))
