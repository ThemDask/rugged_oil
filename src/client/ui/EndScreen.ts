import Phaser from 'phaser';
import { createButton } from './button';
import { Modal } from './modal';
import { THEME } from './theme';

/** HLD end of match: a victory or defeat screen; Exit returns to the main menu. */
export class EndScreen extends Modal {
    constructor(scene: Phaser.Scene, won: boolean, onExit: () => void) {
        super(scene, won ? 'VICTORY' : 'DEFEAT', 400, 200, won ? THEME.text : THEME.textAccent);
        this.panel.add(createButton(scene, 0, 30, 'Exit', onExit, { primary: true }));
    }
}
