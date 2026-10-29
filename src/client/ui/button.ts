import Phaser from 'phaser';

const IDLE = 0x2a2a2e;
const HOVER = 0x3c3c42;
const BORDER = 0x8a8a8a;

/** A simple text button: dark panel with a thin grey border, highlighted on hover. */
export function createButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, width = 240): Phaser.GameObjects.Container {
    const height = 44;
    const bg = scene.add.rectangle(0, 0, width, height, IDLE).setStrokeStyle(1, BORDER);
    const text = scene.add.text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '20px', color: '#e8e2d6' }).setOrigin(0.5);
    const button = scene.add.container(x, y, [bg, text]).setSize(width, height);
    bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(HOVER))
        .on('pointerout', () => bg.setFillStyle(IDLE))
        .on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonReleased()) onClick();
        });
    return button;
}

/** Changes a button's label (e.g. for "Map: Test Map" style selectors). */
export function setButtonLabel(button: Phaser.GameObjects.Container, label: string): void {
    (button.list[1] as Phaser.GameObjects.Text).setText(label);
}
