import Phaser from 'phaser';
import { DebugOverlay } from '../ui/DebugOverlay';
import { PauseMenu } from '../ui/PauseMenu';
import type { MatchScene } from './MatchScene';

/**
 * In-match overlay, drawn on top of the match without being affected by its camera zoom:
 * debug info now, the real HUD later. Esc opens the menu.
 */
export class HudScene extends Phaser.Scene {
    private debug!: DebugOverlay;
    private menu: PauseMenu | null = null;

    constructor() {
        super('Hud');
    }

    create(): void {
        this.menu = null;
        this.debug = new DebugOverlay(this);
        this.input.keyboard!.on('keydown-ESC', () => this.toggleMenu());
    }

    update(): void {
        const match = this.match();
        this.debug.update(this.game, match.world, match.selection.selected.length);
    }

    private toggleMenu(): void {
        const match = this.match();
        if (this.menu) {
            this.menu.close();
            this.menu = null;
            match.paused = false;
            return;
        }
        match.paused = true;
        this.menu = new PauseMenu(this, () => match.exitToMenu());
    }

    private match(): MatchScene {
        return this.scene.get('Match') as MatchScene;
    }
}
