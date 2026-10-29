import Phaser from 'phaser';
import type { MapDef } from '../../data/types';
import { TILE_SIZE, hexColor } from '../scale';

const OBSTACLE_FILL = 0x6b5440;
const OBSTACLE_LINE = 0x9a9a9a;

/**
 * Draws a map: the background image if the map has one (stretched over the whole map),
 * otherwise a flat ground color with a faint tile grid. Obstacles are placeholder blocks
 * until obstacle sprites exist.
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
            ground.lineStyle(1, 0x000000, 0.06);
            for (let x = 0; x <= map.width; x++) ground.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, this.heightPx);
            for (let y = 0; y <= map.height; y++) ground.lineBetween(0, y * TILE_SIZE, this.widthPx, y * TILE_SIZE);
        }

        const obstacles = scene.add.graphics().setDepth(-5);
        for (const o of map.obstacles) {
            obstacles.fillStyle(OBSTACLE_FILL).fillRect(o.x * TILE_SIZE, o.y * TILE_SIZE, o.w * TILE_SIZE, o.h * TILE_SIZE);
            obstacles.lineStyle(1.5, OBSTACLE_LINE).strokeRect(o.x * TILE_SIZE, o.y * TILE_SIZE, o.w * TILE_SIZE, o.h * TILE_SIZE);
        }
    }
}
