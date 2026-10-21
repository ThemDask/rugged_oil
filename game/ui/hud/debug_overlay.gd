extends Label
## Temporary on-screen debug info (FPS, selection size). Replaced by the real HUD in M7.

var _selected_count: int = 0


func _process(_delta: float) -> void:
	text = "FPS %d   selected %d" % [Engine.get_frames_per_second(), _selected_count]


func on_selection_changed(selected: Array[Unit]) -> void:
	_selected_count = selected.size()
