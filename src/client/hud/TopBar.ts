import Phaser from 'phaser';
import type { PlayerState } from '../../sim/state';
import { THEME, textStyle } from '../ui/theme';
import type { Rect } from './layout';
import { hudPanel } from './panel';

const ICON = 20;

/**
 * HLD HUD (1): the top bar, ⅔ of the screen wide: the three resources with their symbols, the
 * population (x/cap), and a Settings button on the far right that opens the escape menu.
 */
export class TopBar {
    private readonly values = new Map<string, Phaser.GameObjects.Text>();
    private readonly population: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, r: Rect, resources: string[], private readonly populationCap: number, onSettings: () => void) {
        hudPanel(scene, r);
        const cy = r.y + r.h / 2;
        const slot = Math.min(150, (r.w - 60) / (resources.length + 1));
        let x = r.x + 20;
        for (const res of resources) {
            scene.add.image(x, cy, `icon_${res}`).setDisplaySize(ICON, ICON).setOrigin(0, 0.5);
            this.values.set(res, scene.add.text(x + ICON + 8, cy, '0', textStyle(16)).setOrigin(0, 0.5));
            x += slot;
            scene.add.rectangle(x - 16, cy, 1, r.h - 12, THEME.lineDim);
        }
        scene.add.image(x, cy, 'icon_population').setDisplaySize(ICON, ICON).setOrigin(0, 0.5);
        this.population = scene.add.text(x + ICON + 8, cy, '', textStyle(16)).setOrigin(0, 0.5);

        scene.add
            .image(r.x + r.w - 20, cy, 'icon_settings')
            .setDisplaySize(ICON, ICON)
            .setInteractive({ useHandCursor: true })
            .on('pointerup', onSettings);
    }

    update(player: PlayerState): void {
        for (const [res, text] of this.values) text.setText(String(player.resources[res] ?? 0));
        this.population.setText(`${player.population} / ${this.populationCap}`);
    }
}
