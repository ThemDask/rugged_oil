import Phaser from 'phaser';
import { angleDiff } from '../../sim/math';
import type { SimUnit } from '../../sim/unit';
import { hexColor, simLengthToPx, simToPx, stepsToRadians } from '../scale';

const OUTLINE = 0x9a9a9a;
const SELECTED = 0x7dff7d;

/**
 * Draws one sim unit and follows it, interpolating between the last two ticks so movement looks
 * smooth at any frame rate. Placeholder look: a sharp-edged hull in the team color with a thin
 * grey outline. Views only read the sim; they never change it.
 */
export class UnitView {
    readonly unit: SimUnit;
    private readonly root: Phaser.GameObjects.Container;
    private readonly hull: Phaser.GameObjects.Graphics;
    private readonly overlay: Phaser.GameObjects.Graphics;
    private readonly radiusPx: number;
    private selected = false;
    private drawnHealth = -1;

    constructor(scene: Phaser.Scene, unit: SimUnit, color: string) {
        this.unit = unit;
        this.radiusPx = simLengthToPx(unit.radius);
        this.hull = scene.add.graphics();
        this.overlay = scene.add.graphics();
        this.root = scene.add.container(0, 0, [this.hull, this.overlay]).setDepth(unit.isBase ? 1 : 2);
        drawHull(this.hull, this.radiusPx, hexColor(color), unit.isBase);
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

    /** Selection ring and health bar (not rotated with the hull). */
    private drawOverlay(): void {
        const g = this.overlay;
        const r = this.radiusPx;
        g.clear();
        this.drawnHealth = this.unit.health;
        if (this.selected) g.lineStyle(2, SELECTED).strokeCircle(0, 0, r + 4);
        if (this.selected || this.unit.health < this.unit.maxHealth) {
            const w = r * 2;
            g.fillStyle(0x000000, 0.6).fillRect(-r, -r - 10, w, 4);
            g.fillStyle(0x50d050).fillRect(-r, -r - 10, (w * this.unit.health) / this.unit.maxHealth, 4);
        }
    }
}

/** Placeholder hull pointing along +x: a pointed body; base vehicles get a deck and turret. */
function drawHull(g: Phaser.GameObjects.Graphics, r: number, color: number, isBase: boolean): void {
    const w = r * 0.62;
    const body = [
        new Phaser.Math.Vector2(r, 0),
        new Phaser.Math.Vector2(r * 0.55, -w),
        new Phaser.Math.Vector2(-r, -w),
        new Phaser.Math.Vector2(-r, w),
        new Phaser.Math.Vector2(r * 0.55, w),
    ];
    g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(25).color).fillPoints(body, true);
    g.lineStyle(1.5, OUTLINE).strokePoints(body, true);
    if (isBase) {
        g.fillStyle(color).fillRect(-r * 0.7, -w * 0.6, r * 1.1, w * 1.2);
        g.lineStyle(1, OUTLINE).strokeRect(-r * 0.7, -w * 0.6, r * 1.1, w * 1.2);
        g.fillStyle(0x2a2a2e).fillCircle(r * 0.05, 0, w * 0.35);
        g.lineStyle(2, OUTLINE).lineBetween(r * 0.05, 0, r * 0.55, 0);
    } else {
        g.lineStyle(1.5, OUTLINE).lineBetween(-r * 0.2, 0, r * 0.7, 0);
    }
}
