import Phaser from 'phaser';
import { createButton } from '../ui/button';
import { SettingsDialog } from '../ui/SettingsDialog';

/** Main menu: Play, Settings, Exit. */
export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create(): void {
        const { width, height } = this.scale;
        const cx = width / 2;
        this.add.text(cx, height * 0.28, 'RUGGED OIL', { fontFamily: 'sans-serif', fontSize: '56px', color: '#c8a46e' }).setOrigin(0.5);
        createButton(this, cx, height * 0.5, 'Play', () => this.scene.start('MatchSetup'));
        createButton(this, cx, height * 0.5 + 60, 'Settings', () => new SettingsDialog(this));
        createButton(this, cx, height * 0.5 + 120, 'Exit', () => window.close());
    }
}
