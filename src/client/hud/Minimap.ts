import Phaser from 'phaser';
import type { MapDef } from '../../data/types';
import type { SimWorld } from '../../sim/world';
import { UNITS_PER_TILE } from '../../sim/math';
import { TILE_SIZE, hexColor } from '../scale';
import { THEME } from '../ui/theme';
import type { Rect } from './layout';
import { hudPanel } from './panel';

const FRIENDLY = 0x4a90ff;
const ENEMY = 0xff3b30;
const POINT = 0x3a6fd8;
const OWN_POINT = 0x9cc8ff;
/** Redraws per second of the moving parts (units, points, camera view). */
const REDRAW_MS = 200;

/**
 * HLD HUD (5): the minimap. Obstacles, reserves (with their resource symbol) and requisition
 * points (blue; your own lighter blue), friendly units as blue dots and enemies as red dots,
 * HQs bigger, and the camera's view as a rectangle. No fog on the minimap itself; once fog of
 * war exists (M5) it shows only enemies currently visible. Clicking moves the camera.
 */
export class Minimap {
    private readonly dynamic: Phaser.GameObjects.Graphics;
    private readonly scale: number;
    private sinceRedraw = REDRAW_MS;

    constructor(scene: Phaser.Scene, private readonly r: Rect, map: MapDef, private readonly world: SimWorld, private readonly playerId: number, onClick: (worldX: number, worldY: number) => void) {
        this.scale = r.w / (map.width * UNITS_PER_TILE);
        hudPanel(scene, r)
            .setFillStyle(hexColor(map.groundColor), 1)
            .on('pointerdown', (p: Phaser.Input.Pointer) => this.click(p, onClick))
            .on('pointermove', (p: Phaser.Input.Pointer) => p.leftButtonDown() && this.click(p, onClick));

        const tile = r.w / map.width;
        const stat = scene.add.graphics().fillStyle(0x5a4636);
        for (const o of map.obstacles) stat.fillRect(r.x + o.x * tile, r.y + o.y * tile, o.w * tile, o.h * tile);
        for (const reserve of world.reserves.values()) {
            const at = this.toMap(reserve.position);
            scene.add.image(at.x, at.y, `icon_${reserve.resource}`).setDisplaySize(12, 12).setTintFill(reserve.resource === 'oil' ? 0x111111 : 0xd0d8e0);
        }
        this.dynamic = scene.add.graphics();
    }

    update(deltaMs: number, view: Phaser.Geom.Rectangle): void {
        this.sinceRedraw += deltaMs;
        if (this.sinceRedraw < REDRAW_MS) return;
        this.sinceRedraw = 0;
        const g = this.dynamic.clear();
        for (const point of this.world.reqPoints.values()) {
            const at = this.toMap(point.position);
            g.fillStyle(point.owner === this.playerId ? OWN_POINT : POINT).fillRect(at.x - 3, at.y - 3, 6, 6);
        }
        for (const unit of this.world.units.values()) {
            const at = this.toMap(unit.position);
            const size = unit.isHq ? 6 : 3;
            g.fillStyle(unit.playerId === this.playerId ? FRIENDLY : ENEMY).fillRect(at.x - size / 2, at.y - size / 2, size, size);
        }
        const k = this.r.w / (this.world.grid.width * TILE_SIZE);
        g.lineStyle(1, THEME.line).strokeRect(this.r.x + view.x * k, this.r.y + view.y * k, view.width * k, view.height * k);
    }

    private toMap(p: { x: number; y: number }): { x: number; y: number } {
        return { x: this.r.x + p.x * this.scale, y: this.r.y + p.y * this.scale };
    }

    private click(p: Phaser.Input.Pointer, onClick: (worldX: number, worldY: number) => void): void {
        const k = (this.world.grid.width * TILE_SIZE) / this.r.w;
        onClick((p.x - this.r.x) * k, (p.y - this.r.y) * k);
    }
}
