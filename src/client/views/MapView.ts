import Phaser from 'phaser';
import type { MapDef } from '../../data/types';
import { TILE_SIZE, hexColor } from '../scale';

/**
 * Draws a map's static parts: the background image if the map has one (stretched over the whole
 * map), otherwise a flat ground colour with a faint tile grid; and the obstacles, each its sprite
 * (or placeholder) stretched over its tile rectangle.
 */
export class MapView {
    readonly widthPx: number;
    readonly heightPx: number;

    constructor(scene: Phaser.Scene, map: MapDef) {
        this.widthPx = map.width * TILE_SIZE;
        this.heightPx = map.height * TILE_SIZE;

        if (map.background && scene.textures.exists(map.background)) {
            scene.add.image(0, 0, map.background).setOrigin(0).setDisplaySize(this.widthPx, this.heightPx).setDepth(-10);
        } else {
            const ground = scene.add.graphics().setDepth(-10);
            ground.fillStyle(hexColor(map.groundColor)).fillRect(0, 0, this.widthPx, this.heightPx);
            ground.lineStyle(1, 0x000000, 0.05);
            for (let x = 0; x <= map.width; x += 4) ground.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, this.heightPx);
            for (let y = 0; y <= map.height; y += 4) ground.lineBetween(0, y * TILE_SIZE, this.widthPx, y * TILE_SIZE);
        }

        for (const o of map.obstacles) {
            scene.add
                .image(o.x * TILE_SIZE, o.y * TILE_SIZE, o.sprite ?? 'obstacle_rock')
                .setOrigin(0)
                .setDisplaySize(o.w * TILE_SIZE, o.h * TILE_SIZE)
                .setDepth(-5);
        }
    }
}
