class_name Tiles
extends RefCounted
## World scale. Game data is measured in tiles, scenes and physics in pixels. Convert here only.

const SIZE := 32


static func to_px(tiles: float) -> float:
	return tiles * SIZE


static func to_tiles(px: float) -> float:
	return px / SIZE


## Pixel position of the center of a grid cell.
static func cell_center(cell: Vector2i) -> Vector2:
	return (Vector2(cell) + Vector2(0.5, 0.5)) * SIZE


## Grid cell containing a pixel position.
static func cell_at(world_position: Vector2) -> Vector2i:
	return Vector2i((world_position / SIZE).floor())
