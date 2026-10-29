import Phaser from 'phaser';
import { gameData } from '../gameData';
import { getSettings } from '../settings';
import { applyVolume } from '../ui/SettingsDialog';

/** Loads assets, checks the game data, applies saved settings, then opens the main menu. */
export class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload(): void {
        // Images and audio go here, e.g. this.load.image('test_map_bg', 'assets/maps/test_map.png').
    }

    create(): void {
        const problems = gameData.validate();
        if (problems.length > 0) console.error('Content problems:\n' + problems.join('\n'));
        applyVolume(this, getSettings());
        this.scene.start('MainMenu');
    }
}
