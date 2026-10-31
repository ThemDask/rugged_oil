import { describe, expect, it } from 'vitest';
import { createSkirmish, validateMatchConfig } from '../src/setup/matchConfig';

const FACTIONS = ['league', 'raiders'];
const MAPS = ['test_map'];

describe('validateMatchConfig', () => {
    it('accepts a 1v1 skirmish and gives only the AI the income bonus', () => {
        const config = createSkirmish('test_map', 'league', 'raiders', 1, 25);
        expect(validateMatchConfig(config, FACTIONS, MAPS)).toEqual([]);
        expect(config.players.map((p) => p.incomeBonusPercent)).toEqual([0, 25]);
    });

    it('rejects unknown maps and factions', () => {
        const problems = validateMatchConfig(createSkirmish('nowhere', 'faction_z', 'league', 1, 25), FACTIONS, MAPS).join('\n');
        expect(problems).toContain("Unknown map 'nowhere'");
        expect(problems).toContain("unknown faction 'faction_z'");
    });

    it('needs exactly one human and two teams', () => {
        const config = createSkirmish('test_map', 'league', 'league', 1, 25);
        config.players[1].controller = 'human';
        config.players[1].team = 0;
        const problems = validateMatchConfig(config, FACTIONS, MAPS).join('\n');
        expect(problems).toContain('Exactly one human');
        expect(problems).toContain('same team');
    });
});
