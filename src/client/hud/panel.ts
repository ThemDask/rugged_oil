import Phaser from 'phaser';
import { THEME } from '../ui/theme';
import type { Rect } from './layout';

/**
 * A HUD panel background: translucent dark fill with a thin light-blue border. It is interactive
 * so clicks on the HUD are swallowed and never reach the map underneath.
 */
export function hudPanel(scene: Phaser.Scene, r: Rect): Phaser.GameObjects.Rectangle {
    return scene.add.rectangle(r.x, r.y, r.w, r.h, THEME.panel, THEME.panelAlpha).setOrigin(0).setStrokeStyle(1, THEME.line).setInteractive();
}
