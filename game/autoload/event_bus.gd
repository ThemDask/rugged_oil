extends Node
## Global, coarse-grained game events. UI, audio and AI listen here so they don't need
## references to the systems that raise the events. Wire nearby nodes with direct signals instead.

@warning_ignore_start("unused_signal")

signal match_started(config: MatchConfig)
signal match_ended(winning_team: int)

signal command_issued(command: Command)

signal entity_spawned(entity: Node)
signal entity_destroyed(entity: Node)

signal player_defeated(player_id: int)
