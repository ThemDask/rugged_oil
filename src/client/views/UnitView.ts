import Phaser from 'phaser';
import { angleDiff } from '../../sim/math';
import type { SimUnit } from '../../sim/unit';
import { hexColor, simLengthToPx, simToPx, stepsToRadians } from '../scale';

const OUTLINE = 0x9a9a9a;
/** HLD: selected units get a thin, bright light-blue rectangle. */
const SELECTED = 0x7fd8ff;

/**
 * Draws one sim unit and follows it, interpolating between the last two ticks so movement looks
 * smooth at any frame rate. Placeholder look: a hull of the unit's real size (length × width) in
 * the team colour with a thin grey outline, until the real sprites arrive. Views only read the sim; they never change it.
 */
export class UnitView {
    readonly unit: SimUnit;
    private readonly root: Phaser.GameObjects.Container;
    private readonly hull: Phaser.GameObjects.Graphics;
    private readonly overlay: Phaser.GameObjects.Graphics;
    private readonly radiusPx: number;
    private readonly halfLength: number;
    private readonly halfWidth: number;
    private selected = false;
    private drawnHealth = -1;

    constructor(scene: Phaser.Scene, unit: SimUnit, color: string) {
        this.unit = unit;
        this.radiusPx = simLengthToPx(unit.stats.radius);
        this.halfLength = simLengthToPx(unit.stats.length) / 2;
        this.halfWidth = simLengthToPx(unit.stats.width) / 2;
        this.hull = scene.add.graphics();
        this.overlay = scene.add.graphics();
        this.root = scene.add.container(0, 0, [this.hull, this.overlay]).setDepth(unit.isHq ? 1 : 2);
        drawHull(this.hull, this.halfLength, this.halfWidth, hexColor(color), unit.isHq);
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

    /** Selection rectangle and health bar (not rotated with the hull). */
    private drawOverlay(): void {
        const g = this.overlay;
        const r = Math.max(this.halfLength, this.halfWidth);
        const maxHealth = this.unit.stats.health;
        g.clear();
        this.drawnHealth = this.unit.health;
        if (this.selected) g.lineStyle(1, SELECTED).strokeRect(-r - 3, -r - 3, r * 2 + 6, r * 2 + 6);
        if (this.selected || this.unit.health < maxHealth) {
            const w = r * 2;
            g.fillStyle(0x000000, 0.6).fillRect(-r, -r - 10, w, 3);
            g.fillStyle(0x50d050).fillRect(-r, -r - 10, (w * this.unit.health) / maxHealth, 3);
        }
    }
}

/** Placeholder hull of the real footprint, pointing along +x. HQs get a deck and turret. */
function drawHull(g: Phaser.GameObjects.Graphics, hl: number, hw: number, color: number, isHq: boolean): void {
    const body = [
        new Phaser.Math.Vector2(hl, -hw * 0.6),
        new Phaser.Math.Vector2(hl, hw * 0.6),
        new Phaser.Math.Vector2(hl * 0.75, hw),
        new Phaser.Math.Vector2(-hl, hw),
        new Phaser.Math.Vector2(-hl, -hw),
        new Phaser.Math.Vector2(hl * 0.75, -hw),
    ];
    g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(25).color).fillPoints(body, true);
    g.lineStyle(1, OUTLINE).strokePoints(body, true);
    if (isHq) {
        g.fillStyle(color).fillRect(-hl * 0.7, -hw * 0.6, hl * 1.1, hw * 1.2);
        g.lineStyle(1, OUTLINE).strokeRect(-hl * 0.7, -hw * 0.6, hl * 1.1, hw * 1.2);
        g.fillStyle(0x2a2a2e).fillCircle(hl * 0.05, 0, hw * 0.3);
        g.lineStyle(2, OUTLINE).lineBetween(hl * 0.05, 0, hl * 0.55, 0);
    } else {
        g.lineStyle(1, OUTLINE).lineBetween(-hl * 0.2, 0, hl * 0.7, 0);
    }
}
