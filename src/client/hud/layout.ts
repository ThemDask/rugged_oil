/**
 * Screen layout of the HUD (HLD "HUD" blueprint), in screen pixels, computed from the canvas
 * size. One place for all the measurements, so the parts line up.
 */
export interface HudLayout {
    topBar: Rect;
    inspector: Rect;
    basic: Rect;
    advanced: Rect;
    minimap: Rect;
    /** Side of an action button. */
    button: number;
    gap: number;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

const MARGIN = 12;
const GAP = 8;
const ACTIONS_HEIGHT = 120;
const INSPECTOR_HEIGHT = 64;

export function hudLayout(width: number, height: number): HudLayout {
    const topWidth = Math.round(width * 0.66);
    const minimapSize = Math.round(Math.min(300, Math.max(180, width * 0.18), height * 0.35));
    const minimap = { x: width - MARGIN - minimapSize, y: height - MARGIN - minimapSize, w: minimapSize, h: minimapSize };
    const actionsWidth = minimap.x - GAP - MARGIN;
    const basicWidth = Math.round(actionsWidth / 3);
    const actionsY = height - MARGIN - ACTIONS_HEIGHT;
    const button = Math.floor((ACTIONS_HEIGHT - 3 * GAP) / 2);
    return {
        topBar: { x: Math.round((width - topWidth) / 2), y: 6, w: topWidth, h: 32 },
        inspector: { x: MARGIN, y: actionsY - GAP - INSPECTOR_HEIGHT, w: basicWidth, h: INSPECTOR_HEIGHT },
        basic: { x: MARGIN, y: actionsY, w: basicWidth, h: ACTIONS_HEIGHT },
        advanced: { x: MARGIN + basicWidth, y: actionsY, w: actionsWidth - basicWidth, h: ACTIONS_HEIGHT },
        minimap,
        button,
        gap: GAP,
    };
}

/** Top-left corners of a cols × rows grid of square buttons, centred in `area`. */
export function buttonGrid(area: Rect, cols: number, rows: number, size: number, gap: number): { x: number; y: number }[] {
    const w = cols * size + (cols - 1) * gap;
    const h = rows * size + (rows - 1) * gap;
    const x0 = area.x + Math.round((area.w - w) / 2);
    const y0 = area.y + Math.round((area.h - h) / 2);
    const cells: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ x: x0 + c * (size + gap), y: y0 + r * (size + gap) });
    return cells;
}
