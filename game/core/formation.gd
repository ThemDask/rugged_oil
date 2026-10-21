class_name Formation
extends RefCounted
## Spreads one target point into a block of points, so a group of units doesn't pile up on it.


## A roughly square block of [param count] points centered on [param center].
static func block(center: Vector2, count: int, spacing: float) -> Array[Vector2]:
	var points: Array[Vector2] = []
	if count <= 0:
		return points
	var cols := ceili(sqrt(count))
	var rows := ceili(float(count) / cols)
	var origin := center - Vector2(cols - 1, rows - 1) * spacing / 2.0
	for i in count:
		@warning_ignore("integer_division")
		points.append(origin + Vector2(i % cols, i / cols) * spacing)
	return points


## Distance between neighbours for units up to [param radius] (pixels) in size.
static func spacing_for(radius: float) -> float:
	return radius * 2.5
