import Phaser from 'phaser';
import { createButton } from './button';
import { Modal } from './modal';
import { THEME, textStyle } from './theme';

/** HLD escape menu: Settings (does nothing yet) and Exit, which ends the match. Esc closes it. */
export class PauseMenu extends Modal {
    constructor(scene: Phaser.Scene, onExit: () => void) {
        super(scene, 'Paused', 360, 250);
        this.panel.add(createButton(scene, 0, -10, 'Settings', () => {}));
        this.panel.add(createButton(scene, 0, 50, 'Exit', onExit));
        this.panel.add(scene.add.text(0, 100, 'Esc to return to the game', textStyle(14, THEME.textDim)).setOrigin(0.5));
    }
}
