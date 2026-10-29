import Phaser from 'phaser';
import type { SimWorld } from '../../sim/world';

/** Temporary on-screen debug info: FPS, sim tick, state checksum, selection size. */
export class DebugOverlay {
    private readonly text: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        this.text = scene.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#e8e2d6', backgroundColor: '#00000080', padding: { x: 6, y: 4 } });
    }

    update(game: Phaser.Game, world: SimWorld, selected: number): void {
        const checksum = world.checksum().toString(16).padStart(8, '0');
        this.text.setText(`FPS ${Math.round(game.loop.actualFps)}   tick ${world.tick}   checksum ${checksum}   selected ${selected}`);
    }
}
