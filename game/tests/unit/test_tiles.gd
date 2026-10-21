extends TestCase
## Tile <-> pixel conversion.


func test_round_trip() -> void:
	assert_eq(Tiles.to_tiles(Tiles.to_px(2.5)), 2.5)


func test_cell_center() -> void:
	assert_eq(Tiles.cell_center(Vector2i(0, 0)), Vector2(Tiles.SIZE, Tiles.SIZE) / 2.0)


func test_cell_at() -> void:
	assert_eq(Tiles.cell_at(Tiles.cell_center(Vector2i(3, 7))), Vector2i(3, 7))
	assert_eq(Tiles.cell_at(Vector2(-1, -1)), Vector2i(-1, -1))
