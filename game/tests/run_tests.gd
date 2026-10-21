extends SceneTree
## Minimal headless test runner (no plugins). Use tools/run_tests.ps1, or directly:
##   godot --headless --path game -s res://tests/run_tests.gd [-- <filter>]
## Runs every test_* method of every res://tests/**/test_*.gd script. A test fails on a failed
## assertion or on any script error raised while it runs. Exit code 0 = all passed.

const TESTS_ROOT := "res://tests"


## Counts engine/script errors so a crashing test is reported as failed, not silently passed.
class ErrorCounter extends Logger:
	var _mutex := Mutex.new()
	var _count := 0

	func _log_error(_function: String, _file: String, _line: int, _code: String, _rationale: String,
			_editor_notify: bool, error_type: int, _script_backtraces: Array[ScriptBacktrace]) -> void:
		if error_type == ERROR_TYPE_WARNING:
			return
		_mutex.lock()
		_count += 1
		_mutex.unlock()

	func count() -> int:
		_mutex.lock()
		var c := _count
		_mutex.unlock()
		return c


func _initialize() -> void:
	# Autoloads are added to the tree after _initialize; wait one frame for them.
	await process_frame
	var exit_code := await _run_all()
	quit(exit_code)


func _run_all() -> int:
	var args := OS.get_cmdline_user_args()
	var filter := args[0] if args.size() > 0 else ""
	var errors := ErrorCounter.new()
	OS.add_logger(errors)

	var passed := 0
	var failed := 0
	var started := Time.get_ticks_msec()

	for path in _find_test_files(TESTS_ROOT):
		var script: GDScript = load(path)
		if script == null or not script.can_instantiate():
			print("FAIL  %s (could not load script)" % path)
			failed += 1
			continue

		for method in script.get_script_method_list():
			var test_name: String = method["name"]
			if not test_name.begins_with("test_"):
				continue
			if filter != "" and not (filter in path or filter in test_name):
				continue

			var case: TestCase = script.new()
			case.tree = self
			var errors_before := errors.count()
			case.before_each()
			await case.call(test_name)
			case.after_each()
			var new_errors := errors.count() - errors_before
			if new_errors > 0:
				case.failures.append("%d error(s) logged during the test (see output above)" % new_errors)

			var label := "%s :: %s" % [path.trim_prefix(TESTS_ROOT + "/"), test_name]
			if case.failures.is_empty():
				passed += 1
				print("ok    " + label)
			else:
				failed += 1
				print("FAIL  " + label)
				for f in case.failures:
					print("      " + f)

	OS.remove_logger(errors)
	var elapsed := (Time.get_ticks_msec() - started) / 1000.0
	print("\n%d passed, %d failed (%.2fs)" % [passed, failed, elapsed])
	if passed + failed == 0:
		print("No tests matched.")
		return 1
	return 0 if failed == 0 else 1


static func _find_test_files(dir_path: String) -> PackedStringArray:
	var out := PackedStringArray()
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return out
	for sub in dir.get_directories():
		out.append_array(_find_test_files(dir_path.path_join(sub)))
	for file in dir.get_files():
		if file.begins_with("test_") and file.ends_with(".gd") and file != "test_case.gd":
			out.append(dir_path.path_join(file))
	return out
