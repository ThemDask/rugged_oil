class_name PlayerSlot
extends Resource
## One participant in a match, as configured on the skirmish setup screen.

enum Controller { HUMAN, AI }
enum AIDifficulty { EASY, NORMAL, HARD }

@export var controller: Controller = Controller.AI
@export var faction: StringName
## Players with the same team number are allies.
@export var team: int = 0
@export var color: Color = Color.WHITE
## Only used when controller is AI.
@export var ai_difficulty: AIDifficulty = AIDifficulty.NORMAL
## Start position on the map; -1 picks a random free one.
@export var spawn_index: int = -1


static func create(p_controller: Controller, p_faction: StringName, p_team: int) -> PlayerSlot:
	var slot := PlayerSlot.new()
	slot.controller = p_controller
	slot.faction = p_faction
	slot.team = p_team
	return slot


func is_human() -> bool:
	return controller == Controller.HUMAN
