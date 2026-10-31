import Phaser from 'phaser';
import type { GameData } from '../../data/registry';
import type { SimUnit } from '../../sim/unit';
import { THEME, textStyle } from '../ui/theme';
import type { Rect } from './layout';
import { hudPanel } from './panel';

const PAD = 8;
const STAT_ICONS = ['icon_armour', 'icon_speed', 'icon_sight'];

/**
 * HLD HUD (2): the unit inspector, shown only while a unit is selected. Shows the first selected
 * unit: icon, name, a thin green HP bar with current/max above it, and its stats as symbol +
 * value (armour front/side/rear, top speed, spotting range).
 */
export class UnitInspector {
    private readonly root: Phaser.GameObjects.Container;
    private readonly icon: Phaser.GameObjects.Image;
    private readonly name: Phaser.GameObjects.Text;
    private readonly hp: Phaser.GameObjects.Text;
    private readonly bar: Phaser.GameObjects.Graphics;
    private readonly stats: Phaser.GameObjects.Text[];
    private readonly iconSize: number;
    private readonly barX: number;
    private readonly barWidth: number;
    private shown: { id: number; health: number; load: string } | null = null;

    constructor(scene: Phaser.Scene, r: Rect, private readonly data: GameData) {
        this.iconSize = r.h - 2 * PAD;
        this.barX = PAD * 2 + this.iconSize;
        this.barWidth = Math.min(140, r.w * 0.4);
        const statsX = this.barX + this.barWidth + 16;

        this.icon = scene.add.image(PAD + this.iconSize / 2, r.h / 2, '__DEFAULT');
        this.name = scene.add.text(this.barX, PAD, '', textStyle(15));
        this.hp = scene.add.text(this.barX, PAD + 22, '', textStyle(11, THEME.textDim));
        this.bar = scene.add.graphics();
        const items: Phaser.GameObjects.GameObject[] = [hudPanel(scene, { x: 0, y: 0, w: r.w, h: r.h }), this.icon, this.name, this.hp, this.bar];
        this.stats = STAT_ICONS.map((key, i) => {
            const y = PAD + 4 + i * 17;
            const text = scene.add.text(statsX + 12, y, '', textStyle(12));
            items.push(scene.add.image(statsX, y + 7, key).setDisplaySize(14, 14), text);
            return text;
        });
        this.root = scene.add.container(r.x, r.y, items).setVisible(false);
    }

    update(unit: SimUnit | undefined, color: number): void {
        this.root.setVisible(unit !== undefined);
        if (!unit) {
            this.shown = null;
            return;
        }
        const load = Object.entries(unit.load).filter(([, n]) => n > 0).map(([res, n]) => `${n} ${res}`).join(', ');
        if (this.shown?.id === unit.id && this.shown.health === unit.health && this.shown.load === load) return;
        if (this.shown?.id !== unit.id) {
            const def = this.data.requireUnit(unit.defId);
            this.icon.setTexture(unit.defId).setTint(color);
            this.icon.setScale(this.iconSize / Math.max(this.icon.width, this.icon.height));
            const a = unit.stats.armour;
            this.stats[0].setText(`${a.front} / ${a.side} / ${a.rear}`);
            this.stats[1].setText(`${def.topSpeed} m/s`);
            this.stats[2].setText(`${def.spottingRange} m`);
        }
        this.name.setText(this.data.requireUnit(unit.defId).displayName + (load ? `  (carrying ${load})` : ''));
        this.shown = { id: unit.id, health: unit.health, load };
        const max = unit.stats.health;
        const barY = PAD + 40;
        this.hp.setText(`HP ${unit.health} / ${max}`);
        this.bar.clear().fillStyle(0x000000, 0.6).fillRect(this.barX, barY, this.barWidth, 3);
        this.bar.fillStyle(THEME.hpBar).fillRect(this.barX, barY, (this.barWidth * unit.health) / max, 3);
    }
}
