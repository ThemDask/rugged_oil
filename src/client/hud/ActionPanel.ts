import Phaser from 'phaser';
import type { GameData } from '../../data/registry';
import type { Resources } from '../../data/types';
import { ticks } from '../../data/convert';
import { canAfford } from '../../sim/production';
import { isAutomatic } from '../../sim/upgrades';
import type { PlayerState } from '../../sim/state';
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
    apply(upgradeId: string): void;
}

interface ButtonSpec {
    texture?: string;
    label?: string;
    /** What the button does, so it can be dimmed (or show progress) when that isn't possible. */
    kind?: 'recruit' | 'research' | 'apply';
    /** The unit (recruit) or upgrade (research, apply) id. */
    id?: string;
    tooltip: string;
    onClick: () => void;
}

/**
 * HLD HUD (3) and (4): the basic actions (2 × 2: Move, Stop, Attack-move, Hold fire) and, split
 * by a thin vertical line, the advanced actions (6 × 2), which depend on the selected unit. With
 * the HQ selected they are its recruit buttons and upgrades to research (with a progress bar
 * while researching and a tick once done); with another unit selected, the researched per-unit
 * upgrades for its type, applied to the selected units of that type. A tooltip above shows what
 * a button does and costs. Buttons dim when their action isn't possible right now.
 */
export class ActionPanel {
    private advanced: { button: Phaser.GameObjects.Container; spec: ButtonSpec }[] = [];
    private advancedFor: string | null = null;
    private readonly tooltip: Phaser.GameObjects.Text;
    private readonly basicButtons: Phaser.GameObjects.Container[];
    /** Research progress bars and "done" ticks, drawn over the buttons. */
    private readonly marks: Phaser.GameObjects.Graphics;

    constructor(private readonly scene: Phaser.Scene, private readonly layout: HudLayout, private readonly data: GameData, private readonly handlers: ActionHandlers) {
        const { basic, advanced, button, gap } = layout;
        hudPanel(scene, { x: basic.x, y: basic.y, w: basic.w + advanced.w, h: basic.h });
        scene.add.rectangle(advanced.x, basic.y + 8, 1, basic.h - 16, THEME.line).setOrigin(0);
        this.tooltip = scene.add.text(advanced.x, advanced.y - 8, '', textStyle(13)).setOrigin(0, 1).setBackgroundColor('#0d1b2acc').setPadding(6, 3).setVisible(false);
        const cells = buttonGrid(basic, 2, 2, button, gap);
        this.basicButtons = BASIC.map((b, i) =>
            this.button(cells[i].x, cells[i].y, { texture: b.icon, tooltip: b.label, onClick: () => handlers.basic(b.action) }),
        );
        this.marks = scene.add.graphics().setDepth(1);
    }

    /** `selected` are the local player's selected units; the first decides the advanced actions. */
    update(selected: SimUnit[], player: PlayerState, color: number): void {
        const unit = selected[0];
        for (const b of this.basicButtons) b.setVisible(unit !== undefined);
        // Rebuild when the selected type changes, or when a research ends (new per-unit upgrades).
        const key = unit ? `${unit.defId}|${player.researched.length}` : null;
        if (key !== this.advancedFor) this.rebuild(unit, player, color);
        this.advancedFor = key;
        this.marks.clear();
        const size = this.layout.button;
        for (const { button, spec } of this.advanced) {
            const state = this.state(spec, selected, player);
            button.setAlpha(state === 'ready' ? 1 : 0.4);
            if (state === 'done') {
                // A tick in the corner.
                this.marks.lineStyle(2, THEME.hpBar).beginPath();
                this.marks.moveTo(button.x + size - 16, button.y + 9).lineTo(button.x + size - 11, button.y + 14).lineTo(button.x + size - 4, button.y + 5).strokePath();
            } else if (state === 'researching' && player.research) {
                const total = ticks(this.data.upgrade(player.research.upgradeId)!.researchTime);
                const done = 1 - player.research.ticksLeft / total;
                this.marks.fillStyle(THEME.hpBar).fillRect(button.x + 3, button.y + size - 6, (size - 6) * done, 3);
            }
        }
    }

    /** Whether a button's action can be done now, is in progress, or is already done. */
    private state(spec: ButtonSpec, selected: SimUnit[], player: PlayerState): 'ready' | 'blocked' | 'researching' | 'done' {
        const rules = this.data.rules;
        switch (spec.kind) {
            case 'recruit': {
                const def = this.data.requireUnit(spec.id!);
                const pop = rules.sizeClasses[def.sizeClass].population;
                const ok = canAfford(player, def.cost) && player.population + pop <= rules.populationCap && player.queue.length < rules.productionQueueSize;
                return ok ? 'ready' : 'blocked';
            }
            case 'research': {
                const up = this.data.upgrade(spec.id!)!;
                if (player.researched.includes(up.id)) return 'done';
                if (player.research?.upgradeId === up.id) return 'researching';
                return !player.research && canAfford(player, up.cost) ? 'ready' : 'blocked';
            }
            case 'apply': {
                const up = this.data.upgrade(spec.id!)!;
                const targets = selected.filter((u) => u.defId === up.appliesTo);
                if (targets.every((u) => u.upgrades.includes(up.id))) return 'done';
                return canAfford(player, up.applyCost ?? {}) ? 'ready' : 'blocked';
            }
            default:
                return 'ready';
        }
    }

    private rebuild(unit: SimUnit | undefined, player: PlayerState, color: number): void {
        for (const { button } of this.advanced) button.destroy();
        this.advanced = [];
        if (!unit) return;

        const specs: ButtonSpec[] = [];
        const f = this.data.faction(player.faction)!;
        if (unit.isHq) {
            for (const id of f.units) {
                const def = this.data.requireUnit(id);
                const tooltip = `Recruit ${def.displayName}: ${costText(def.cost)}, ${def.recruitTime} s`;
                specs.push({ texture: id, kind: 'recruit', id, tooltip, onClick: () => this.handlers.recruit(id) });
            }
            for (const id of f.upgrades) {
                const up = this.data.upgrade(id)!;
                const tooltip = `Research ${up.displayName}: ${up.description} ${costText(up.cost)}, ${up.researchTime} s`;
                specs.push({ label: up.displayName, kind: 'research', id, tooltip, onClick: () => this.handlers.research(id) });
            }
        } else {
            // Researched upgrades that are applied to units of this type one by one.
            for (const id of player.researched) {
                const up = this.data.upgrade(id)!;
                if (isAutomatic(up) || up.appliesTo !== unit.defId) continue;
                const name = this.data.requireUnit(up.appliesTo).displayName;
                const tooltip = `Apply ${up.displayName} to the selected ${name}s: ${up.description} ${costText(up.applyCost ?? {})} each`;
                specs.push({ label: up.displayName, kind: 'apply', id, tooltip, onClick: () => this.handlers.apply(id) });
            }
        }
        const { advanced, button, gap } = this.layout;
        const cells = buttonGrid(advanced, 6, 2, button, gap);
        this.advanced = specs.slice(0, cells.length).map((spec, i) => {
            const button = this.button(cells[i].x, cells[i].y, spec);
            if (spec.texture) (button.list[1] as Phaser.GameObjects.Image).setTint(color);
            return { button, spec };
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
