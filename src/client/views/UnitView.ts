import Phaser from 'phaser';
import { angleDiff } from '../../sim/math';
import type { SimUnit } from '../../sim/unit';
import { hexColor, simLengthToPx, simToPx, stepsToRadians } from '../scale';
import { THEME } from '../ui/theme';

/**
 * Draws one sim unit and follows it, interpolating between the last two ticks so movement looks
 * smooth at any frame rate. The sprite's texture key is the unit id and its display size is the
 * unit's footprint, so real art (or the placeholder) always matches the game data. Views only
 * read the sim; they never change it.
 */
export class UnitView {
    readonly unit: SimUnit;
    private readonly root: Phaser.GameObjects.Container;
    private readonly hull: Phaser.GameObjects.Image;
    private readonly overlay: Phaser.GameObjects.Graphics;
    private readonly radiusPx: number;
    /** Half the side of the selection rectangle. */
    private readonly halfBox: number;
    private selected = false;
    private drawnHealth = -1;

    constructor(scene: Phaser.Scene, unit: SimUnit, color: string) {
        this.unit = unit;
        this.radiusPx = simLengthToPx(unit.stats.radius);
        const length = simLengthToPx(unit.stats.length);
        const width = simLengthToPx(unit.stats.width);
        this.halfBox = Math.max(length, width) / 2 + 3;
        this.hull = scene.add.image(0, 0, unit.defId).setDisplaySize(length, width).setTint(hexColor(color));
        this.overlay = scene.add.graphics();
        this.root = scene.add.container(0, 0, [this.hull, this.overlay]).setDepth(unit.isHq ? 1 : 2);
        this.update(1);
    }

    get id(): number {
        return this.unit.id;
    }

    get playerId(): number {
        return this.unit.playerId;
    }

    get radius(): number {
        return this.radiusPx;
    }

    /** Current drawn position in pixels. */
    get x(): number {
        return this.root.x;
    }

    get y(): number {
        return this.root.y;
    }

    setSelected(selected: boolean): void {
        if (this.selected === selected) return;
        this.selected = selected;
        this.drawOverlay();
    }

    /** `alpha` is how far we are between the previous tick (0) and the current one (1). */
    update(alpha: number): void {
        const from = simToPx(this.unit.previousPosition);
        const to = simToPx(this.unit.position);
        this.root.setPosition(from.x + (to.x - from.x) * alpha, from.y + (to.y - from.y) * alpha);
        // Interpolate along the shortest turn between the two headings.
        const turn = angleDiff(this.unit.previousHeading, this.unit.heading);
        this.hull.rotation = stepsToRadians(this.unit.previousHeading + turn * alpha);
        if (this.unit.health !== this.drawnHealth) this.drawOverlay();
    }

    destroy(): void {
        this.root.destroy();
    }

    /** HLD: selected units get a thin light-blue rectangle; health bar when selected or damaged. Not rotated with the hull. */
    private drawOverlay(): void {
        const g = this.overlay;
        const r = this.halfBox;
        const maxHealth = this.unit.stats.health;
        g.clear();
        this.drawnHealth = this.unit.health;
        if (this.selected) g.lineStyle(1, THEME.line).strokeRect(-r, -r, r * 2, r * 2);
        if (this.selected || this.unit.health < maxHealth) {
            g.fillStyle(0x000000, 0.6).fillRect(-r, -r - 6, r * 2, 3);
            g.fillStyle(THEME.hpBar).fillRect(-r, -r - 6, (r * 2 * this.unit.health) / maxHealth, 3);
        }
    }
}
