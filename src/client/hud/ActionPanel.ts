import Phaser from 'phaser';
import type { GameData } from '../../data/registry';
import type { Resources } from '../../data/types';
import type { SimUnit } from '../../sim/unit';
import type { IconKey } from '../placeholders';
import { THEME, textStyle } from '../ui/theme';
import { buttonGrid, type HudLayout } from './layout';
import { hudPanel } from './panel';

export type BasicAction = 'move' | 'stop' | 'attackMove' | 'holdFire';

const BASIC: { action: BasicAction; icon: IconKey; label: string }[] = [
    { action: 'move', icon: 'action_move', label: 'Move' },
    { action: 'stop', icon: 'action_stop', label: 'Stop' },
    { action: 'attackMove', icon: 'action_attack_move', label: 'Attack-move' },
    { action: 'holdFire', icon: 'action_hold_fire', label: 'Hold fire' },
];

export interface ActionHandlers {
    basic(action: BasicAction): void;
    recruit(unitDefId: string): void;
    research(upgradeId: string): void;
}

interface ButtonSpec {
    texture?: string;
    label?: string;
    tooltip: string;
    onClick: () => void;
}

/**
 * HLD HUD (3) and (4): the basic actions (2 × 2: Move, Stop, Attack-move, Hold fire) and, split
 * by a thin vertical line, the advanced actions (6 × 2), which depend on the selected unit. With
 * the HQ selected they are its recruit buttons and upgrades. A tooltip above shows what a
 * button does and costs.
 */
export class ActionPanel {
    private advanced: Phaser.GameObjects.Container[] = [];
    private advancedFor: string | null = null;
    private readonly tooltip: Phaser.GameObjects.Text;
    private readonly basicButtons: Phaser.GameObjects.Container[];

    constructor(private readonly scene: Phaser.Scene, private readonly layout: HudLayout, private readonly data: GameData, private readonly handlers: ActionHandlers) {
        const { basic, advanced, button, gap } = layout;
        hudPanel(scene, { x: basic.x, y: basic.y, w: basic.w + advanced.w, h: basic.h });
        scene.add.rectangle(advanced.x, basic.y + 8, 1, basic.h - 16, THEME.line).setOrigin(0);
        this.tooltip = scene.add.text(advanced.x, advanced.y - 8, '', textStyle(13)).setOrigin(0, 1).setBackgroundColor('#0d1b2acc').setPadding(6, 3).setVisible(false);
        const cells = buttonGrid(basic, 2, 2, button, gap);
        this.basicButtons = BASIC.map((b, i) =>
            this.button(cells[i].x, cells[i].y, { texture: b.icon, tooltip: b.label, onClick: () => handlers.basic(b.action) }),
        );
    }

    /** `unit` is the first selected unit of the local player, if any. */
    update(unit: SimUnit | undefined, faction: string, color: number): void {
        for (const b of this.basicButtons) b.setVisible(unit !== undefined);
        const key = unit ? unit.defId : null;
        if (key === this.advancedFor) return;
        this.advancedFor = key;
        for (const b of this.advanced) b.destroy();
        this.advanced = [];
        if (!unit?.isHq) return;

        const specs: ButtonSpec[] = [];
        const f = this.data.faction(faction)!;
        for (const id of f.units) {
            const def = this.data.requireUnit(id);
            specs.push({ texture: id, tooltip: `Recruit ${def.displayName}: ${costText(def.cost)}, ${def.recruitTime} s`, onClick: () => this.handlers.recruit(id) });
        }
        for (const id of f.upgrades) {
            const up = this.data.upgrade(id)!;
            specs.push({ label: up.displayName, tooltip: `Research ${up.displayName}: ${up.description} ${costText(up.cost)}, ${up.researchTime} s`, onClick: () => this.handlers.research(id) });
        }
        const { advanced, button, gap } = this.layout;
        const cells = buttonGrid(advanced, 6, 2, button, gap);
        this.advanced = specs.slice(0, cells.length).map((s, i) => {
            const b = this.button(cells[i].x, cells[i].y, s);
            if (s.texture) (b.list[1] as Phaser.GameObjects.Image).setTint(color);
            return b;
        });
    }

    private button(x: number, y: number, spec: ButtonSpec): Phaser.GameObjects.Container {
        const size = this.layout.button;
        const bg = this.scene.add.rectangle(0, 0, size, size, THEME.panel, 1).setOrigin(0).setStrokeStyle(1, THEME.lineDim);
        let face: Phaser.GameObjects.GameObject;
        if (spec.texture) {
            const image = this.scene.add.image(size / 2, size / 2, spec.texture);
            image.setScale((size * 0.75) / Math.max(image.width, image.height));
            face = image;
        } else {
            face = this.scene.add
                .text(size / 2, size / 2, spec.label ?? '', { ...textStyle(10), align: 'center', wordWrap: { width: size - 6 } })
                .setOrigin(0.5);
        }
        bg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                bg.setStrokeStyle(1, THEME.line);
                this.tooltip.setText(spec.tooltip).setVisible(true);
            })
            .on('pointerout', () => {
                bg.setStrokeStyle(1, THEME.lineDim);
                this.tooltip.setVisible(false);
            })
            .on('pointerup', (p: Phaser.Input.Pointer) => {
                if (p.leftButtonReleased()) spec.onClick();
            });
        return this.scene.add.container(x, y, [bg, face]);
    }
}

function costText(cost: Resources): string {
    const parts = Object.entries(cost).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`);
    return parts.length > 0 ? parts.join(', ') : 'free';
}
