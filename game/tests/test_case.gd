class_name TestCase
extends RefCounted
## Base class for tests. Every method named test_* in a res://tests/**/test_*.gd script is run
## on a fresh instance by run_tests.gd. Methods may use await.

## The running SceneTree, for tests that need to add nodes or wait frames.
var tree: SceneTree

var failures: PackedStringArray = []


func before_each() -> void:
	pass


func after_each() -> void:
	pass


func assert_true(condition: bool, message: String = "") -> void:
	if not condition:
		_fail("expected true", message)


func assert_false(condition: bool, message: String = "") -> void:
	if condition:
		_fail("expected false", message)


func assert_eq(actual: Variant, expected: Variant, message: String = "") -> void:
	if not _equal(actual, expected):
		_fail("expected %s, got %s" % [var_to_str(expected), var_to_str(actual)], message)


func assert_ne(actual: Variant, unexpected: Variant, message: String = "") -> void:
	if _equal(actual, unexpected):
		_fail("did not expect %s" % var_to_str(unexpected), message)


func assert_null(value: Variant, message: String = "") -> void:
	if value != null:
		_fail("expected null, got %s" % var_to_str(value), message)


func assert_not_null(value: Variant, message: String = "") -> void:
	if value == null:
		_fail("expected a value, got null", message)


## For validator-style APIs that return a list of problems.
func assert_no_problems(problems: PackedStringArray, message: String = "") -> void:
	if not problems.is_empty():
		_fail("unexpected problems:\n      - " + "\n      - ".join(problems), message)


func assert_has_problem(problems: PackedStringArray, substring: String, message: String = "") -> void:
	for p in problems:
		if substring in p:
			return
	_fail("no problem containing '%s' in %s" % [substring, problems], message)


func fail(message: String) -> void:
	_fail("failed", message)


func _fail(reason: String, message: String) -> void:
	failures.append(reason if message.is_empty() else "%s: %s" % [message, reason])


## Like ==, but treats int/float and String/StringName as comparable instead of erroring.
static func _equal(a: Variant, b: Variant) -> bool:
	var ta := typeof(a)
	var tb := typeof(b)
	if ta == tb:
		return a == b
	var numbers := [TYPE_INT, TYPE_FLOAT]
	if ta in numbers and tb in numbers:
		return a == b
	var strings := [TYPE_STRING, TYPE_STRING_NAME]
	if ta in strings and tb in strings:
		return String(a) == String(b)
	return false
