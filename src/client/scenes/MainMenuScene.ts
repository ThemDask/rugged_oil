import Phaser from 'phaser';
import { createButton } from '../ui/button';
import { THEME, textStyle } from '../ui/theme';

/**
 * Main menu (HLD "Main Menu"): the title on a trapezoid banner above a column of buttons:
 * Play, Army viewer, Settings and, set apart, Exit. Army viewer and Settings do nothing yet.
 */
export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create(): void {
        const { width, height } = this.scale;
        const cx = width / 2;
        this.cameras.main.setBackgroundColor(THEME.background);

        const bannerTop = height * 0.08;
        const bannerHeight = Math.min(140, height * 0.16);
        const columnWidth = 300;
        const bannerWide = Math.min(900, width * 0.7);
        const banner = this.add.graphics();
        banner.fillStyle(THEME.panel, THEME.panelAlpha).lineStyle(2, THEME.line);
        const trapezoid = [
            new Phaser.Math.Vector2(cx - bannerWide / 2, bannerTop),
            new Phaser.Math.Vector2(cx + bannerWide / 2, bannerTop),
            new Phaser.Math.Vector2(cx + bannerWide * 0.3, bannerTop + bannerHeight),
            new Phaser.Math.Vector2(cx - bannerWide * 0.3, bannerTop + bannerHeight),
        ];
        banner.fillPoints(trapezoid, true).strokePoints(trapezoid, true);
        this.add.text(cx, bannerTop + bannerHeight / 2, 'RUGGED OIL', textStyle(54)).setOrigin(0.5);

        const columnTop = bannerTop + bannerHeight;
        const columnHeight = Math.min(420, height * 0.62);
        banner.fillStyle(THEME.panel, THEME.panelAlpha).fillRect(cx - columnWidth / 2, columnTop, columnWidth, columnHeight);
        banner.strokeRect(cx - columnWidth / 2, columnTop, columnWidth, columnHeight);

        const step = 64;
        let y = columnTop + 50;
        createButton(this, cx, y, 'PLAY', () => this.scene.start('MatchSetup'), { primary: true });
        createButton(this, cx, (y += step), 'Army viewer', () => {});
        createButton(this, cx, (y += step), 'Settings', () => {});
        createButton(this, cx, columnTop + columnHeight - 50, 'Exit', () => window.close());
    }
}
