import Phaser from 'phaser';
import { metres, ticks } from '../../data/convert';
import { ONE } from '../../sim/math';
import type { MatchConfig } from '../../setup/matchConfig';
import type { SimWorld } from '../../sim/world';
import { hexColor, simLengthToPx, simToPx } from '../scale';

const NEUTRAL = 0xffffff;

/**
 * Requisition points (a flag tinted with the owner's colour, and the faint capture square) and
 * oil and metal reserves (hidden once empty). Reads sim state every frame; never writes it.
 */
export class MapObjectsView {
    private readonly flags = new Map<number, Phaser.GameObjects.Image>();
    private readonly reserves = new Map<number, Phaser.GameObjects.Image>();
    private readonly progress: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, private readonly world: SimWorld, private readonly config: MatchConfig) {
        const area = simLengthToPx(metres(world.data.rules.capture.areaSize));
        const squares = scene.add.graphics().setDepth(-4);
        for (const point of world.reqPoints.values()) {
            const at = simToPx(point.position);
            squares.lineStyle(1, 0xffffff, 0.35).strokeRect(at.x - area / 2, at.y - area / 2, area, area);
            this.flags.set(point.id, scene.add.image(at.x, at.y, 'requisition_point').setDisplaySize(24, 24).setDepth(-3));
        }
        this.progress = scene.add.graphics().setDepth(-3);
        const size = simLengthToPx(metres(world.data.rules.reserveSize));
        for (const reserve of world.reserves.values()) {
            const at = simToPx(reserve.position);
            this.reserves.set(reserve.id, scene.add.image(at.x, at.y, `reserve_${reserve.resource}`).setDisplaySize(size, size).setDepth(-4));
        }
    }

    update(): void {
        const full = ticks(this.world.data.rules.capture.captureTime) * ONE;
        this.progress.clear();
        for (const point of this.world.reqPoints.values()) {
            const color = point.owner >= 0 ? hexColor(this.config.players[point.owner].color) : NEUTRAL;
            this.flags.get(point.id)?.setTint(color);
            if (point.progress > 0 && point.capturer >= 0) {
                // Capture (or neutralise) progress, in the capturing side's colour.
                const at = simToPx(point.position);
                this.progress.fillStyle(0x000000, 0.6).fillRect(at.x - 20, at.y + 16, 40, 4);
                this.progress.fillStyle(hexColor(this.config.players[point.capturer].color)).fillRect(at.x - 20, at.y + 16, (40 * point.progress) / full, 4);
            }
        }
        for (const reserve of this.world.reserves.values()) this.reserves.get(reserve.id)?.setVisible(reserve.amountLeft > 0);
    }
}
