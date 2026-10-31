import Phaser from 'phaser';
import { createSkirmish } from '../../setup/matchConfig';
import { gameData } from '../gameData';
import { createButton, setButtonLabel } from '../ui/button';

/** Create-match screen: choose map and faction. The opponent is always one AI. */
export class MatchSetupScene extends Phaser.Scene {
    private mapIndex = 0;
    private factionIndex = 0;

    constructor() {
        super('MatchSetup');
    }

    create(): void {
        const maps = gameData.maps();
        const factions = gameData.factions();
        const { width, height } = this.scale;
        const cx = width / 2;

        this.add.text(cx, height * 0.2, 'Create match', { fontFamily: 'sans-serif', fontSize: '40px', color: '#c8a46e' }).setOrigin(0.5);
        this.add.text(cx, height * 0.2 + 44, '1v1 against the AI', { fontFamily: 'sans-serif', fontSize: '18px', color: '#9a9a9a' }).setOrigin(0.5);

        const mapLabel = () => `Map: ${maps[this.mapIndex].displayName}`;
        const factionLabel = () => `Faction: ${factions[this.factionIndex].displayName}`;
        const mapButton = createButton(this, cx, height * 0.45, mapLabel(), () => {
            this.mapIndex = (this.mapIndex + 1) % maps.length;
            setButtonLabel(mapButton, mapLabel());
        }, 360);
        const factionButton = createButton(this, cx, height * 0.45 + 60, factionLabel(), () => {
            this.factionIndex = (this.factionIndex + 1) % factions.length;
            setButtonLabel(factionButton, factionLabel());
        }, 360);

        createButton(this, cx - 130, height * 0.75, 'Back', () => this.scene.start('MainMenu'));
        createButton(this, cx + 130, height * 0.75, 'Start', () => {
            const faction = factions[this.factionIndex];
            // The AI takes another faction when there is one, else mirrors the player's.
            const aiFaction = factions.find((f) => f.id !== faction.id) ?? faction;
            const seed = Math.floor(Math.random() * 0x7fffffff);
            this.scene.start('Match', { config: createSkirmish(maps[this.mapIndex].id, faction.id, aiFaction.id, seed, gameData.rules.aiIncomeBonusPercent) });
        });
    }
}
