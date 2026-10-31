import Phaser from 'phaser';
import { insideCaptureArea } from '../../sim/capture';
import { insideReserve } from '../../sim/economy';
import type { SimWorld } from '../../sim/world';
import { pxToSim } from '../scale';
import { THEME } from '../ui/theme';
import type { UnitView } from '../views/UnitView';
import type { CommandBridge } from './CommandBridge';

/** A left-button drag shorter than this (screen pixels) counts as a click. */
const CLICK_MAX_DRAG = 6;
/** Pressing a control group key twice within this time centres the camera on the group. */
const DOUBLE_TAP_MS = 350;
const DIGITS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

/** An order waiting for its target to be clicked on the map (after pressing Move or Attack-move). */
export type TargetingOrder = 'move' | 'attackMove';

/**
 * Mouse and keyboard control for the human player (HLD "Controls"):
 * - left-click selects a unit, left-drag selects with a box, Shift adds to the selection;
 * - right-click gives the default order: capture on a requisition point, gather on a reserve
 *   (extractors only; the others move there), otherwise move. Shift + right-click queues it;
 * - after the Move or Attack-move button, the next left-click picks the target (right-click or
 *   Esc cancels);
 * - Ctrl + 1-9 assigns a control group, 1-9 selects it, pressing it twice centres the camera.
 * Only the player's own units can be selected. Produces Commands; never touches sim state.
 */
export class Selection {
    readonly selected: UnitView[] = [];
    /** The order waiting for a target click, if any. */
    targeting: TargetingOrder | null = null;
    private readonly box: Phaser.GameObjects.Graphics;
    private readonly groups = new Map<number, number[]>();
    private dragStart: { worldX: number; worldY: number; x: number; y: number } | null = null;
    private lastGroupKey = { group: -1, at: 0 };

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly playerId: number,
        private readonly views: Map<number, UnitView>,
        private readonly bridge: CommandBridge,
        private readonly world: SimWorld,
        private readonly centerCamera: (x: number, y: number) => void,
    ) {
        this.box = scene.add.graphics().setDepth(100);
        scene.input.mouse?.disableContextMenu();

        scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (this.targeting) {
                if (p.leftButtonDown()) this.order(this.targeting, p.worldX, p.worldY, p.event.shiftKey);
                this.setTargeting(null);
                return;
            }
            if (p.leftButtonDown()) this.dragStart = { worldX: p.worldX, worldY: p.worldY, x: p.x, y: p.y };
            else if (p.rightButtonDown()) this.defaultOrder(p.worldX, p.worldY, p.event.shiftKey);
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

        // Capture the digits so Ctrl + digit doesn't reach the browser where it can be blocked.
        scene.input.keyboard!.addCapture(DIGITS.join(','));
        DIGITS.forEach((key, i) => {
            scene.input.keyboard!.on(`keydown-${key}`, (e: KeyboardEvent) => (e.ctrlKey ? this.assignGroup(i + 1) : this.recallGroup(i + 1)));
        });
    }

    /** Starts (or with null, cancels) waiting for a target click. */
    setTargeting(order: TargetingOrder | null): void {
        this.targeting = order && this.selected.length > 0 ? order : null;
        this.scene.input.setDefaultCursor(this.targeting ? 'crosshair' : 'default');
    }

    /** Drops a view from the selection and groups (e.g. when its unit died). */
    forget(view: UnitView): void {
        const i = this.selected.indexOf(view);
        if (i >= 0) this.selected.splice(i, 1);
        for (const [n, ids] of this.groups) this.groups.set(n, ids.filter((id) => id !== view.id));
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
        this.select(picked, add);
    }

    private select(picked: UnitView[], add: boolean): void {
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

    private order(type: TargetingOrder, worldX: number, worldY: number, queue: boolean): void {
        if (this.selected.length === 0) return;
        this.bridge.issue({ type, playerId: this.playerId, unitIds: this.selected.map((v) => v.id), target: pxToSim(worldX, worldY), queue });
    }

    /** Right-click: capture a point, gather from a reserve, or move. */
    private defaultOrder(worldX: number, worldY: number, queue: boolean): void {
        if (this.selected.length === 0) return;
        const at = pxToSim(worldX, worldY);
        const playerId = this.playerId;
        const unitIds = this.selected.map((v) => v.id);
        for (const point of this.world.reqPoints.values()) {
            if (insideCaptureArea(this.world, point, at)) {
                this.bridge.issue({ type: 'capture', playerId, unitIds, pointId: point.id, queue });
                return;
            }
        }
        for (const reserve of this.world.reserves.values()) {
            if (reserve.amountLeft <= 0 || !insideReserve(this.world, reserve, at)) continue;
            const extractors = this.selected.filter((v) => v.unit.stats.extraction).map((v) => v.id);
            if (extractors.length > 0) this.bridge.issue({ type: 'gather', playerId, unitIds: extractors, reserveId: reserve.id, queue });
            const others = unitIds.filter((id) => !extractors.includes(id));
            if (others.length > 0) this.bridge.issue({ type: 'move', playerId, unitIds: others, target: at, queue });
            return;
        }
        this.order('move', worldX, worldY, queue);
    }

    private assignGroup(n: number): void {
        this.groups.set(n, this.selected.map((v) => v.id));
    }

    private recallGroup(n: number): void {
        const views = (this.groups.get(n) ?? []).map((id) => this.views.get(id)).filter((v): v is UnitView => v !== undefined);
        if (views.length === 0) return;
        const now = this.scene.time.now;
        if (this.lastGroupKey.group === n && now - this.lastGroupKey.at < DOUBLE_TAP_MS) {
            this.centerCamera(views[0].x, views[0].y);
        }
        this.lastGroupKey = { group: n, at: now };
        this.select(views, false);
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
