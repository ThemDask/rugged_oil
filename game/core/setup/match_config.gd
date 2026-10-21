class_name MatchConfig
extends Resource
## Everything the player picks before a skirmish. Produced by the setup screen and consumed by
## the match scene. Together with the command log it is also the header of a replay.

@export var map_id: StringName
@export var players: Array[PlayerSlot] = []
@export var fog_of_war: bool = true
@export_range(0.5, 3.0, 0.25) var game_speed: float = 1.0
## Overrides GameRules.starting_resources per resource type; empty = use the rules' defaults.
@export var starting_resources: Dictionary[StringName, int] = {}
## 0 = pick a random seed when the match starts.
@export var random_seed: int = 0


## Returns problems that make the match unplayable (empty = valid).
## [param known_factions] is the list of faction ids that exist (normally from GameData).
func validate(known_factions: Array[StringName]) -> PackedStringArray:
	var problems := PackedStringArray()
	if players.size() < 2:
		problems.append("A match needs at least 2 players.")

	var humans := 0
	var teams: Dictionary[int, bool] = {}
	for i in players.size():
		var slot := players[i]
		if slot == null:
			problems.append("Player slot %d is empty." % i)
			continue
		if slot.is_human():
			humans += 1
		if slot.faction not in known_factions:
			problems.append("Player %d has unknown faction '%s'." % [i, slot.faction])
		teams[slot.team] = true

	if humans != 1:
		problems.append("Exactly one human player is supported (found %d)." % humans)
	if players.size() >= 2 and teams.size() < 2:
		problems.append("All players are on the same team.")
	return problems
