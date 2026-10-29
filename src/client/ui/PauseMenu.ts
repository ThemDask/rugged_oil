import Phaser from 'phaser';
import { createButton } from './button';
import { Modal } from './modal';

/** The in-match Esc menu. Exit ends the match and returns to the main menu. */
export class PauseMenu extends Modal {
    constructor(scene: Phaser.Scene, onExit: () => void) {
        super(scene, 'Menu', 360, 220);
        this.panel.add(createButton(scene, 0, 10, 'Exit match', onExit));
        this.panel.add(scene.add.text(0, 70, 'Esc to return to the game', { fontFamily: 'sans-serif', fontSize: '14px', color: '#9a9a9a' }).setOrigin(0.5));
    }
}
