import Phaser from 'phaser';
import type { SimWorld } from '../../sim/world';
import type { PlayerState } from '../../sim/state';
import { THEME } from '../ui/theme';
import type { Rect } from './layout';

const SLOT = 40;
const GAP = 6;

/**
 * The HQ's production queue, shown above the advanced actions while the HQ is selected: one
 * icon per queued unit, the front one with its progress bar. Clicking an icon cancels that unit
 * (full refund). Not specified in the HLD blueprint; placed where it doesn't cover anything.
 */
export class ProductionQueue {
    private readonly slots: { bg: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Image }[] = [];
    private readonly bar: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, advanced: Rect, size: number, private readonly world: SimWorld, onCancel: (index: number) => void) {
        const right = advanced.x + advanced.w - GAP;
        const y = advanced.y - SLOT - 8;
        for (let i = 0; i < size; i++) {
            const x = right - (size - i) * (SLOT + GAP);
            const bg = scene.add.rectangle(x, y, SLOT, SLOT, THEME.panel, THEME.panelAlpha).setOrigin(0).setStrokeStyle(1, THEME.line);
            bg.setInteractive({ useHandCursor: true }).on('pointerup', (p: Phaser.Input.Pointer) => p.leftButtonReleased() && onCancel(i));
            const icon = scene.add.image(x + SLOT / 2, y + SLOT / 2, '__DEFAULT');
            this.slots.push({ bg, icon });
        }
        this.bar = scene.add.graphics();
        this.update(undefined, 0xffffff);
    }

    /** `player` is set while the local player's HQ is selected. */
    update(player: PlayerState | undefined, color: number): void {
        const queue = player?.queue ?? [];
        this.bar.clear();
        this.slots.forEach((slot, i) => {
            const entry = queue[i];
            slot.bg.setVisible(entry !== undefined);
            slot.icon.setVisible(entry !== undefined);
            if (!entry) return;
            if (slot.icon.texture.key !== entry.unitDefId) {
                slot.icon.setTexture(entry.unitDefId);
                slot.icon.setScale((SLOT * 0.8) / Math.max(slot.icon.width, slot.icon.height));
            }
            slot.icon.setTint(color);
            if (i === 0) {
                const total = this.world.unitStatsOf(entry.unitDefId).recruitTicks;
                const done = total > 0 ? 1 - entry.ticksLeft / total : 1;
                this.bar.fillStyle(THEME.hpBar).fillRect(slot.bg.x + 3, slot.bg.y + SLOT - 6, (SLOT - 6) * done, 3);
            }
        });
    }
}
