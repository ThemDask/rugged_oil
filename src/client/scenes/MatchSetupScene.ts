import Phaser from 'phaser';
import { createSkirmish } from '../../setup/matchConfig';
import { gameData } from '../gameData';
import { createButton, setButtonLabel } from '../ui/button';
import { THEME, textStyle } from '../ui/theme';

/** Match setup (HLD): choose the map, your faction and the enemy faction, then Start. The enemy is the AI. */
export class MatchSetupScene extends Phaser.Scene {
    private mapIndex = 0;
    private factionIndex = 0;
    private enemyIndex = 1;

    constructor() {
        super('MatchSetup');
    }

    create(): void {
        const maps = gameData.maps();
        const factions = gameData.factions();
        this.enemyIndex = Math.min(this.enemyIndex, factions.length - 1);
        const { width, height } = this.scale;
        const cx = width / 2;
        this.cameras.main.setBackgroundColor(THEME.background);

        this.add.text(cx, height * 0.18, 'Match setup', textStyle(40)).setOrigin(0.5);
        this.add.text(cx, height * 0.18 + 44, '1v1 against the AI', textStyle(18, THEME.textDim)).setOrigin(0.5);

        const selector = (y: number, label: () => string, next: () => void) => {
            const button = createButton(this, cx, y, label(), () => {
                next();
                setButtonLabel(button, label());
            }, { width: 420 });
        };
        selector(height * 0.42, () => `Map: ${maps[this.mapIndex].displayName}`, () => (this.mapIndex = (this.mapIndex + 1) % maps.length));
        selector(height * 0.42 + 60, () => `Your faction: ${factions[this.factionIndex].displayName}`, () => (this.factionIndex = (this.factionIndex + 1) % factions.length));
        selector(height * 0.42 + 120, () => `Enemy faction: ${factions[this.enemyIndex].displayName}`, () => (this.enemyIndex = (this.enemyIndex + 1) % factions.length));

        createButton(this, cx - 130, height * 0.78, 'Back', () => this.scene.start('MainMenu'));
        createButton(this, cx + 130, height * 0.78, 'Start', () => {
            const seed = Math.floor(Math.random() * 0x7fffffff);
            const config = createSkirmish(maps[this.mapIndex].id, factions[this.factionIndex].id, factions[this.enemyIndex].id, seed, gameData.rules.aiIncomeBonusPercent);
            this.scene.start('Match', { config });
        }, { primary: true });
    }
}
