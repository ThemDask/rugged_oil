import Phaser from 'phaser';
import { getSettings } from '../settings';

const PAN_SPEED = 900; // screen pixels per second, the same at every zoom
const EDGE_MARGIN = 12;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 1.1;

/**
 * Top-down RTS camera: pan with WASD/arrows, screen edges (if enabled in settings) or
 * middle-mouse drag; zoom toward the cursor with the mouse wheel. Kept inside the map.
 */
export class RtsCamera {
    private readonly camera: Phaser.Cameras.Scene2D.Camera;
    private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

    constructor(private readonly scene: Phaser.Scene, mapWidth: number, mapHeight: number) {
        this.camera = scene.cameras.main;
        this.camera.setBounds(0, 0, mapWidth, mapHeight);
        this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;

        scene.input.on('wheel', (pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
            this.zoomAt(pointer.x, pointer.y, dy < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
        });
        scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.middleButtonDown()) return;
            this.camera.scrollX -= (pointer.x - pointer.prevPosition.x) / this.camera.zoom;
            this.camera.scrollY -= (pointer.y - pointer.prevPosition.y) / this.camera.zoom;
        });
    }

    centerOn(x: number, y: number): void {
        this.camera.centerOn(x, y);
    }

    update(deltaMs: number): void {
        const k = this.keys;
        let dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
        let dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
        if (dx === 0 && dy === 0 && getSettings().edgeScroll) [dx, dy] = this.edgeDirection();
        if (dx === 0 && dy === 0) return;
        const len = Math.hypot(dx, dy);
        const step = (PAN_SPEED * deltaMs) / 1000 / this.camera.zoom;
        this.camera.scrollX += (dx / len) * step;
        this.camera.scrollY += (dy / len) * step;
    }

    private edgeDirection(): [number, number] {
        const pointer = this.scene.input.activePointer;
        const { width, height } = this.scene.scale;
        if (!this.scene.game.hasFocus || pointer.x < 0 || pointer.y < 0 || pointer.x > width || pointer.y > height) return [0, 0];
        const dx = pointer.x < EDGE_MARGIN ? -1 : pointer.x > width - EDGE_MARGIN ? 1 : 0;
        const dy = pointer.y < EDGE_MARGIN ? -1 : pointer.y > height - EDGE_MARGIN ? 1 : 0;
        return [dx, dy];
    }

    /** Zooms while keeping the world point under the cursor fixed. */
    private zoomAt(screenX: number, screenY: number, factor: number): void {
        const cam = this.camera;
        const newZoom = Phaser.Math.Clamp(cam.zoom * factor, ZOOM_MIN, ZOOM_MAX);
        // With the default centered origin: world = scroll + w/2 + (screen - w/2) / zoom.
        const offsetX = screenX - cam.width / 2;
        const offsetY = screenY - cam.height / 2;
        cam.scrollX += offsetX / cam.zoom - offsetX / newZoom;
        cam.scrollY += offsetY / cam.zoom - offsetY / newZoom;
        cam.setZoom(newZoom);
    }
}
