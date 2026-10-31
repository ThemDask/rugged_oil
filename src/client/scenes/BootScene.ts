import Phaser from 'phaser';
import { gameData } from '../gameData';
import { createPlaceholders } from '../placeholders';
import { getSettings } from '../settings';
import { applyVolume } from '../ui/SettingsDialog';

/**
 * Loads assets, generates placeholders for any art not provided yet, checks the game data,
 * applies saved settings, then opens the main menu.
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload(): void {
        // Real art goes here under the keys listed in placeholders.ts, e.g.
        // this.load.image('league_knight', 'assets/units/league_knight.png').
    }

    create(): void {
        createPlaceholders(this, gameData);
        const problems = gameData.validate();
        if (problems.length > 0) console.error('Content problems:\n' + problems.join('\n'));
        applyVolume(this, getSettings());
        this.scene.start('MainMenu');
    }
}
