import Phaser from 'phaser';
import { THEME, textStyle } from './theme';

export interface ButtonOptions {
    width?: number;
    height?: number;
    /** The highlighted main action (e.g. Play): accent-coloured border and text. */
    primary?: boolean;
}

/** A text button in the HUD style: dark panel, thin light-blue border, highlighted on hover. */
export function createButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, options: ButtonOptions = {}): Phaser.GameObjects.Container {
    const width = options.width ?? 240;
    const height = options.height ?? 44;
    const border = options.primary ? THEME.accent : THEME.line;
    const bg = scene.add.rectangle(0, 0, width, height, THEME.panel, THEME.panelAlpha).setStrokeStyle(1, border);
    const text = scene.add.text(0, 0, label, textStyle(20, options.primary ? THEME.textAccent : THEME.text)).setOrigin(0.5);
    const button = scene.add.container(x, y, [bg, text]).setSize(width, height);
    bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(THEME.hover, 1))
        .on('pointerout', () => bg.setFillStyle(THEME.panel, THEME.panelAlpha))
        .on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonReleased()) onClick();
        });
    return button;
}

/** Changes a button's label (e.g. for "Map: Test Map" style selectors). */
export function setButtonLabel(button: Phaser.GameObjects.Container, label: string): void {
    (button.list[1] as Phaser.GameObjects.Text).setText(label);
}
