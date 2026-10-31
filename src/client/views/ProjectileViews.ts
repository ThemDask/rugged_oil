import Phaser from 'phaser';
import type { SimWorld } from '../../sim/world';
import { simToPx, stepsToRadians } from '../scale';

/** On-screen size of a projectile at 100% zoom, px. */
const LENGTH = 8;
const WIDTH = 3;

/**
 * One sprite per projectile (texture key "projectile"), interpolated between ticks like units.
 * Projectiles in the local player's fog are hidden.
 */
export class ProjectileViews {
    private readonly sprites = new Map<number, Phaser.GameObjects.Image>();

    constructor(private readonly scene: Phaser.Scene, private readonly world: SimWorld, private readonly playerId: number) {}

    update(alpha: number): void {
        for (const p of this.world.projectiles.values()) {
            let sprite = this.sprites.get(p.id);
            if (!sprite) {
                sprite = this.scene.add.image(0, 0, 'projectile').setDisplaySize(LENGTH, WIDTH).setDepth(3);
                this.sprites.set(p.id, sprite);
            }
            const from = simToPx(p.previousPosition);
            const to = simToPx(p.position);
            sprite.setPosition(from.x + (to.x - from.x) * alpha, from.y + (to.y - from.y) * alpha);
            sprite.rotation = stepsToRadians(p.direction);
            sprite.setVisible(p.playerId === this.playerId || this.world.isVisibleTo(this.playerId, p.position));
        }
        for (const [id, sprite] of this.sprites) {
            if (this.world.projectiles.has(id)) continue;
            sprite.destroy();
            this.sprites.delete(id);
        }
    }
}
