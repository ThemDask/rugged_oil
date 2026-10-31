import Phaser from 'phaser';
import { pxToSim } from '../scale';
import { THEME } from '../ui/theme';
import type { UnitView } from '../views/UnitView';
import type { CommandBridge } from './CommandBridge';

/** A left-button drag shorter than this (screen pixels) counts as a click. */
const CLICK_MAX_DRAG = 6;

/**
 * Mouse control for the human player: left-click selects a unit, left-drag selects with a box,
 * Shift adds to the selection, right-click orders the selection to move. Only the player's own
 * units can be selected. Produces Commands; never touches sim state directly.
 */
export class Selection {
    readonly selected: UnitView[] = [];
    private readonly box: Phaser.GameObjects.Graphics;
    private dragStart: { worldX: number; worldY: number; x: number; y: number } | null = null;

    constructor(
        scene: Phaser.Scene,
        private readonly playerId: number,
        private readonly views: Map<number, UnitView>,
        private readonly bridge: CommandBridge,
    ) {
        this.box = scene.add.graphics().setDepth(100);
        scene.input.mouse?.disableContextMenu();

        scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (p.leftButtonDown()) this.dragStart = { worldX: p.worldX, worldY: p.worldY, x: p.x, y: p.y };
            else if (p.rightButtonDown()) this.orderMove(p.worldX, p.worldY);
        });
        scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (this.dragStart) this.drawBox(p);
        });
        scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
            if (!this.dragStart || !p.leftButtonReleased()) return;
            const isClick = Phaser.Math.Distance.Between(p.x, p.y, this.dragStart.x, this.dragStart.y) < CLICK_MAX_DRAG;
            this.finishSelection(p, isClick, p.event.shiftKey);
            this.dragStart = null;
            this.box.clear();
        });
    }

    /** Drops a view from the selection (e.g. when its unit died). */
    forget(view: UnitView): void {
        const i = this.selected.indexOf(view);
        if (i >= 0) this.selected.splice(i, 1);
    }

    /** The rectangle spanned by two corner points, in any order. */
    static dragRect(ax: number, ay: number, bx: number, by: number): Phaser.Geom.Rectangle {
        return new Phaser.Geom.Rectangle(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
    }

    private finishSelection(p: Phaser.Input.Pointer, isClick: boolean, add: boolean): void {
        const own = [...this.views.values()].filter((v) => v.playerId === this.playerId);
        let picked: UnitView[];
        if (isClick) {
            const hit = own
                .filter((v) => Phaser.Math.Distance.Between(v.x, v.y, p.worldX, p.worldY) <= v.radius + 2)
                .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, p.worldX, p.worldY) - Phaser.Math.Distance.Between(b.x, b.y, p.worldX, p.worldY));
            picked = hit.slice(0, 1);
        } else {
            const rect = Selection.dragRect(this.dragStart!.worldX, this.dragStart!.worldY, p.worldX, p.worldY);
            picked = own.filter((v) => rect.contains(v.x, v.y));
        }
        if (!add) {
            for (const v of this.selected) v.setSelected(false);
            this.selected.length = 0;
        }
        for (const v of picked) {
            if (!this.selected.includes(v)) {
                v.setSelected(true);
                this.selected.push(v);
            }
        }
    }

    private orderMove(worldX: number, worldY: number): void {
        if (this.selected.length === 0) return;
        this.bridge.issue({ type: 'move', playerId: this.playerId, unitIds: this.selected.map((v) => v.id), target: pxToSim(worldX, worldY) });
    }

    private drawBox(p: Phaser.Input.Pointer): void {
        const start = this.dragStart!;
        this.box.clear();
        if (Phaser.Math.Distance.Between(p.x, p.y, start.x, start.y) < CLICK_MAX_DRAG) return;
        const rect = Selection.dragRect(start.worldX, start.worldY, p.worldX, p.worldY);
        this.box.fillStyle(THEME.line, 0.1).fillRectShape(rect);
        this.box.lineStyle(1, THEME.line, 0.8).strokeRectShape(rect);
    }
}
