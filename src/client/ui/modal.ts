import Phaser from 'phaser';
import { THEME, textStyle } from './theme';

/**
 * Base for modal windows: a dimmed full-screen backdrop that swallows clicks, and a centred
 * panel with a title. Subclasses add their content to `panel`.
 */
export class Modal {
    readonly root: Phaser.GameObjects.Container;
    protected readonly panel: Phaser.GameObjects.Container;
    protected readonly scene: Phaser.Scene;

    constructor(scene: Phaser.Scene, title: string, width: number, height: number, titleColor: string = THEME.text) {
        this.scene = scene;
        const { width: sw, height: sh } = scene.scale;
        const backdrop = scene.add.rectangle(0, 0, sw, sh, 0x000000, 0.55).setOrigin(0).setInteractive();
        const frame = scene.add.rectangle(0, 0, width, height, THEME.panel, 0.95).setStrokeStyle(1, THEME.line);
        const heading = scene.add.text(0, -height / 2 + 32, title, textStyle(26, titleColor)).setOrigin(0.5);
        this.panel = scene.add.container(sw / 2, sh / 2, [frame, heading]);
        this.root = scene.add.container(0, 0, [backdrop, this.panel]).setDepth(1000).setScrollFactor(0);
    }

    close(): void {
        this.root.destroy();
    }
}
