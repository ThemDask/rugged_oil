/**
 * The HLD's UI look: thin light-blue lines on dark, translucent panels (menus, widgets, HUD).
 * Every UI element takes its colours and fonts from here.
 */
import type Phaser from 'phaser';

export const THEME = {
    background: 0x0a1420,
    panel: 0x0d1b2a,
    panelAlpha: 0.88,
    line: 0x7fd8ff,
    lineDim: 0x3d6f8f,
    hover: 0x16324a,
    accent: 0xff5a4a,
    hpBar: 0x4cd964,
    text: '#d8f2ff',
    textDim: '#7fa8c0',
    textAccent: '#ff7a6a',
    font: 'sans-serif',
} as const;

/** Text style shorthand. */
export function textStyle(size: number, color: string = THEME.text): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: THEME.font, fontSize: `${size}px`, color };
}
