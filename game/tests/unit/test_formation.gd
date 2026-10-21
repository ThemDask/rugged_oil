extends TestCase
## Group move targets are spread out around the clicked point.


func test_empty_group() -> void:
	assert_true(Formation.block(Vector2.ZERO, 0, 10.0).is_empty())


func test_single_unit_goes_to_the_point() -> void:
	assert_eq(Formation.block(Vector2(5, 5), 1, 10.0), [Vector2(5, 5)])


func test_block_is_centered_on_the_point() -> void:
	var center := Vector2(100, 200)
	var points := Formation.block(center, 4, 10.0)
	var sum := Vector2.ZERO
	for p in points:
		sum += p
	assert_eq(points.size(), 4)
	assert_eq(sum / 4.0, center)


func test_points_keep_their_spacing() -> void:
	var points := Formation.block(Vector2.ZERO, 7, 10.0)
	for i in points.size():
		for j in range(i + 1, points.size()):
			assert_true(points[i].distance_to(points[j]) >= 10.0 - 0.001, "points %d and %d" % [i, j])
