import Phaser from 'phaser';
import { metres } from '../data/convert';
import type { GameData } from '../data/registry';
import { simLengthToPx } from './scale';
import { THEME } from './ui/theme';

/**
 * Placeholder art. Every texture the game uses is listed here under its final key and size, and
 * is generated only if no real image was loaded under that key in BootScene.preload(). To add
 * real art: put the file in public/assets/ and load it there under the same key. Code never
 * changes, because views always set the display size from game data, not from the texture.
 *
 * Conventions for the real art:
 * - Units: key = unit id (e.g. "league_knight"), facing right, drawn at 2× the on-screen size
 *   (HLD appendix "Unit sizes"). Team colour is applied as a tint for now.
 * - Map objects and icons: the keys below; icons are square.
 */

/** Pixel resolution of textures relative to their size on screen at 100% zoom. */
export const ART_SCALE = 2;
/** Side of a reserve's footprint, metres. */
export const RESERVE_SIZE_M = 30;
/** HUD icon keys and their square size (px, at ART_SCALE). */
export const ICONS = [
    'icon_manpower', 'icon_oil', 'icon_metal', 'icon_population', 'icon_settings',
    'icon_armour', 'icon_speed', 'icon_sight',
    'action_move', 'action_stop', 'action_attack_move', 'action_hold_fire',
] as const;
export type IconKey = (typeof ICONS)[number];
const ICON_SIZE = 48;

export function createPlaceholders(scene: Phaser.Scene, data: GameData): void {
    const g = scene.make.graphics({}, false);
    const make = (key: string, w: number, h: number, draw: (w: number, h: number) => void) => {
        if (scene.textures.exists(key)) return;
        g.clear();
        draw(w, h);
        g.generateTexture(key, Math.ceil(w), Math.ceil(h));
    };

    // Units: a light hull of the real footprint, facing right (+x), tinted with the team colour.
    for (const def of data.units()) {
        const size = def.size ?? data.rules.sizeClasses[def.sizeClass];
        const w = simLengthToPx(metres(size.length)) * ART_SCALE;
        const h = simLengthToPx(metres(size.width)) * ART_SCALE;
        make(def.id, w, h, () => drawHull(g, w, h, def.isHq, def.weapons.length));
    }

    // Map objects.
    make('obstacle_rock', 64, 64, (w, h) => {
        g.fillStyle(0x7a6450).fillRect(0, 0, w, h);
        g.fillStyle(0x8e7660).fillCircle(w * 0.3, h * 0.35, w * 0.22).fillCircle(w * 0.68, h * 0.62, w * 0.26);
        g.lineStyle(2, 0x4e3e30).strokeRect(1, 1, w - 2, h - 2);
    });
    make('obstacle_ruin', 64, 64, (w, h) => {
        g.fillStyle(0x6e6a64).fillRect(0, 0, w, h);
        g.lineStyle(3, 0x4a4743);
        for (let i = 16; i < w; i += 16) g.lineBetween(i, 0, i, h);
        g.lineStyle(2, 0x3a3835).strokeRect(1, 1, w - 2, h - 2);
    });
    const reservePx = simLengthToPx(metres(RESERVE_SIZE_M)) * ART_SCALE;
    make('reserve_oil', reservePx, reservePx, (w, h) => drawReserve(g, w, h, 0x1a1a1a, 0x3a3a3a));
    make('reserve_metal', reservePx, reservePx, (w, h) => drawReserve(g, w, h, 0x8a929a, 0xb8c0c8));
    make('requisition_point', 48, 48, (w, h) => {
        g.lineStyle(3, 0xffffff).lineBetween(w * 0.3, h * 0.1, w * 0.3, h * 0.9);
        g.fillStyle(0xffffff).fillTriangle(w * 0.3, h * 0.1, w * 0.85, h * 0.25, w * 0.3, h * 0.42);
    });

    // HUD icons: thin light-blue line drawings.
    for (const key of ICONS) make(key, ICON_SIZE, ICON_SIZE, (w, h) => drawIcon(g, key, w, h));
    g.destroy();
}

function drawHull(g: Phaser.GameObjects.Graphics, w: number, h: number, isHq: boolean, guns: number): void {
    const body = [
        new Phaser.Math.Vector2(w, h * 0.2),
        new Phaser.Math.Vector2(w, h * 0.8),
        new Phaser.Math.Vector2(w * 0.88, h),
        new Phaser.Math.Vector2(0, h),
        new Phaser.Math.Vector2(0, 0),
        new Phaser.Math.Vector2(w * 0.88, 0),
    ];
    g.fillStyle(0xc8c8c8).fillPoints(body, true);
    g.lineStyle(2, 0x505050).strokePoints(body, true);
    if (isHq) {
        g.fillStyle(0xeeeeee).fillRect(w * 0.15, h * 0.2, w * 0.55, h * 0.6);
        g.lineStyle(2, 0x505050).strokeRect(w * 0.15, h * 0.2, w * 0.55, h * 0.6);
    }
    // One barrel per weapon, so armed and unarmed units look different.
    g.fillStyle(0x303030);
    for (let i = 0; i < guns; i++) {
        const y = guns === 1 ? h / 2 : h * (0.32 + (0.36 * i) / (guns - 1));
        g.fillCircle(w * 0.5, y, Math.min(w, h) * 0.16);
        g.fillRect(w * 0.5, y - h * 0.04, w * 0.45, h * 0.08);
    }
}

function drawReserve(g: Phaser.GameObjects.Graphics, w: number, h: number, dark: number, light: number): void {
    g.fillStyle(dark, 0.85).fillCircle(w / 2, h / 2, w * 0.45);
    g.fillStyle(light).fillCircle(w * 0.4, h * 0.4, w * 0.15).fillCircle(w * 0.62, h * 0.58, w * 0.12);
    g.lineStyle(2, 0x000000, 0.6).strokeCircle(w / 2, h / 2, w * 0.45);
}

function drawIcon(g: Phaser.GameObjects.Graphics, key: IconKey, w: number, h: number): void {
    const c = THEME.line;
    g.lineStyle(3, c);
    const cx = w / 2;
    const cy = h / 2;
    switch (key) {
        case 'icon_manpower':
            g.strokeCircle(cx, h * 0.3, h * 0.14);
            g.beginPath().arc(cx, h * 0.9, h * 0.32, Math.PI, 0).strokePath();
            break;
        case 'icon_oil':
            g.fillStyle(c).fillCircle(cx, h * 0.62, w * 0.24).fillTriangle(cx, h * 0.12, w * 0.28, h * 0.55, w * 0.72, h * 0.55);
            break;
        case 'icon_metal':
            g.strokeRect(w * 0.15, h * 0.55, w * 0.32, h * 0.25).strokeRect(w * 0.53, h * 0.55, w * 0.32, h * 0.25).strokeRect(w * 0.34, h * 0.25, w * 0.32, h * 0.25);
            break;
        case 'icon_population':
            g.strokeCircle(w * 0.35, h * 0.32, h * 0.11).strokeCircle(w * 0.65, h * 0.32, h * 0.11);
            g.beginPath().arc(w * 0.35, h * 0.85, h * 0.22, Math.PI, 0).strokePath();
            g.beginPath().arc(w * 0.65, h * 0.85, h * 0.22, Math.PI, 0).strokePath();
            break;
        case 'icon_settings':
            g.strokeCircle(cx, cy, w * 0.18);
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4;
                g.lineBetween(cx + Math.cos(a) * w * 0.26, cy + Math.sin(a) * h * 0.26, cx + Math.cos(a) * w * 0.4, cy + Math.sin(a) * h * 0.4);
            }
            break;
        case 'icon_armour':
            g.strokePoints([new Phaser.Math.Vector2(cx, h * 0.1), new Phaser.Math.Vector2(w * 0.85, h * 0.25), new Phaser.Math.Vector2(w * 0.78, h * 0.65), new Phaser.Math.Vector2(cx, h * 0.92), new Phaser.Math.Vector2(w * 0.22, h * 0.65), new Phaser.Math.Vector2(w * 0.15, h * 0.25)], true);
            break;
        case 'icon_speed':
            for (const dx of [0, 0.25]) g.strokePoints([new Phaser.Math.Vector2(w * (0.2 + dx), h * 0.2), new Phaser.Math.Vector2(w * (0.5 + dx), cy), new Phaser.Math.Vector2(w * (0.2 + dx), h * 0.8)]);
            break;
        case 'icon_sight':
            g.strokeEllipse(cx, cy, w * 0.8, h * 0.45);
            g.fillStyle(c).fillCircle(cx, cy, w * 0.1);
            break;
        case 'action_move':
            g.lineBetween(w * 0.15, cy, w * 0.85, cy).lineBetween(cx, h * 0.15, cx, h * 0.85);
            g.strokePoints([new Phaser.Math.Vector2(w * 0.72, h * 0.38), new Phaser.Math.Vector2(w * 0.85, cy), new Phaser.Math.Vector2(w * 0.72, h * 0.62)]);
            g.strokePoints([new Phaser.Math.Vector2(w * 0.38, h * 0.28), new Phaser.Math.Vector2(cx, h * 0.15), new Phaser.Math.Vector2(w * 0.62, h * 0.28)]);
            break;
        case 'action_stop':
            g.strokeCircle(cx, cy, w * 0.34);
            g.lineBetween(w * 0.26, h * 0.26, w * 0.74, h * 0.74);
            break;
        case 'action_attack_move':
            g.strokeCircle(cx, cy, w * 0.26);
            g.lineBetween(cx, h * 0.1, cx, h * 0.3).lineBetween(cx, h * 0.7, cx, h * 0.9).lineBetween(w * 0.1, cy, w * 0.3, cy).lineBetween(w * 0.7, cy, w * 0.9, cy);
            break;
        case 'action_hold_fire':
            g.strokeRect(w * 0.3, h * 0.25, w * 0.12, h * 0.5).strokeRect(w * 0.58, h * 0.25, w * 0.12, h * 0.5);
            break;
    }
}
