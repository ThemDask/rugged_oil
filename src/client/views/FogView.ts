import Phaser from 'phaser';
import type { SimWorld } from '../../sim/world';
import { TILE_SIZE } from '../scale';

/** Grey of the fog, and how strongly it covers (HLD: a thin grey layer that doesn't hide the map). */
const FOG = { r: 90, g: 90, b: 100, a: 110 };

/**
 * HLD fog of war: a thin grey layer over every tile the local player can't see. It's a texture
 * with one pixel per tile, stretched over the map (with smoothing, so edges look soft), redrawn
 * only when the simulation rebuilds visibility. Enemy units in the fog are hidden by their views.
 */
export class FogView {
    private readonly texture: Phaser.Textures.CanvasTexture;
    private readonly pixels: ImageData;
    private drawnTick = -1;

    constructor(scene: Phaser.Scene, private readonly world: SimWorld, private readonly playerId: number) {
        const { width, height } = world.grid;
        if (scene.textures.exists('fog')) scene.textures.remove('fog');
        this.texture = scene.textures.createCanvas('fog', width, height)!;
        this.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
        this.pixels = this.texture.context.createImageData(width, height);
        scene.add.image(0, 0, 'fog').setOrigin(0).setDisplaySize(width * TILE_SIZE, height * TILE_SIZE).setDepth(0);
        this.update();
    }

    update(): void {
        // Visibility is rebuilt every few ticks; redraw once per new tick at most.
        if (this.world.tick === this.drawnTick) return;
        this.drawnTick = this.world.tick;
        const visible = this.world.players.get(this.playerId)!.visible;
        const data = this.pixels.data;
        for (let i = 0; i < visible.length; i++) {
            const o = i * 4;
            data[o] = FOG.r;
            data[o + 1] = FOG.g;
            data[o + 2] = FOG.b;
            data[o + 3] = visible[i] === 1 ? 0 : FOG.a;
        }
        this.texture.context.putImageData(this.pixels, 0, 0);
        this.texture.refresh();
    }
}
