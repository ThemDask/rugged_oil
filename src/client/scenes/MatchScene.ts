import Phaser from 'phaser';
import { AiController } from '../../ai/AiController';
import { createSkirmish, validateMatchConfig, type MatchConfig } from '../../setup/matchConfig';
import { TICK_MS } from '../../sim/constants';
import { formationBlock } from '../../sim/formation';
import { fromAngle, vadd } from '../../sim/math';
import { createWorld } from '../../sim/setup';
import type { SimWorld } from '../../sim/world';
import { gameData } from '../gameData';
import { simToPx } from '../scale';
import { CommandBridge } from '../systems/CommandBridge';
import { RtsCamera } from '../systems/RtsCamera';
import { Selection } from '../systems/Selection';
import { MapObjectsView } from '../views/MapObjectsView';
import { MapView } from '../views/MapView';
import { OrderLinesView } from '../views/OrderLinesView';
import { UnitView } from '../views/UnitView';

/** Most ticks to catch up in one frame, so a long stall doesn't freeze the game. */
const MAX_TICKS_PER_FRAME = 5;

/**
 * Runs one skirmish: builds the simulation from a MatchConfig, advances it in fixed ticks, and
 * keeps one view per sim unit. The HUD (HudScene) runs as a separate scene on top and reads
 * `world`, `selection`, `humanId` and `bridge` from here.
 */
export class MatchScene extends Phaser.Scene {
    world!: SimWorld;
    config!: MatchConfig;
    selection!: Selection;
    bridge!: CommandBridge;
    camera!: RtsCamera;
    /** The local player's id. */
    humanId = 0;
    /** True while the Esc menu is open (single-player pauses the simulation). */
    paused = false;

    private mapObjects!: MapObjectsView;
    private orderLines!: OrderLinesView;
    private readonly views = new Map<number, UnitView>();
    private ais: AiController[] = [];
    private accumulator = 0;

    constructor() {
        super('Match');
    }

    init(data: { config?: MatchConfig }): void {
        // Without a config (e.g. starting this scene directly while developing), play a dev match.
        const factions = gameData.factions();
        this.config = data.config ?? createSkirmish(gameData.maps()[0].id, factions[0].id, factions[factions.length - 1].id, 1, gameData.rules.aiIncomeBonusPercent);
        this.views.clear();
        this.accumulator = 0;
        this.paused = false;
    }

    create(): void {
        const problems = validateMatchConfig(this.config, gameData.factions().map((f) => f.id), gameData.maps().map((m) => m.id));
        if (problems.length > 0) throw new Error('Cannot start match:\n' + problems.join('\n'));

        this.world = createWorld(this.config, gameData);
        const mapView = new MapView(this, gameData.map(this.config.mapId)!);
        this.mapObjects = new MapObjectsView(this, this.world, this.config);
        this.camera = new RtsCamera(this, mapView.widthPx, mapView.heightPx);
        this.bridge = new CommandBridge(this.world);

        const humanId = (this.humanId = this.config.players.findIndex((p) => p.controller === 'human'));
        this.ais = this.config.players.flatMap((p, id) => (p.controller === 'ai' ? [new AiController(id)] : []));
        for (const unit of this.world.units.values()) {
            this.views.set(unit.id, new UnitView(this, unit, this.config.players[unit.playerId].color));
        }
        this.selection = new Selection(this, humanId, this.views, this.bridge, this.world, (x, y) => this.camera.centerOn(x, y));
        this.orderLines = new OrderLinesView(this, this.world, this.selection);
        if (import.meta.env.DEV) this.input.keyboard!.on('keydown-F2', () => this.devSpawnArmy());

        const base = [...this.world.units.values()].find((u) => u.playerId === humanId && u.isHq);
        if (base) {
            const at = simToPx(base.position);
            this.camera.centerOn(at.x, at.y);
        }
        this.scene.launch('Hud');
    }

    update(_time: number, delta: number): void {
        this.camera.update(delta);
        if (!this.paused) {
            this.accumulator += delta;
            let ticks = 0;
            while (this.accumulator >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
                for (const ai of this.ais) for (const command of ai.think(this.world)) this.bridge.issue(command);
                this.world.step();
                this.accumulator -= TICK_MS;
                ticks++;
            }
            if (ticks === MAX_TICKS_PER_FRAME) this.accumulator = 0;
        }
        const alpha = this.paused ? 1 : this.accumulator / TICK_MS;
        this.syncViews();
        for (const view of this.views.values()) view.update(alpha);
        this.mapObjects.update();
        this.orderLines.update();
    }

    /** Adds views for new units and removes views (and selection) of units that are gone. */
    private syncViews(): void {
        for (const unit of this.world.units.values()) {
            if (!this.views.has(unit.id)) this.views.set(unit.id, new UnitView(this, unit, this.config.players[unit.playerId].color));
        }
        for (const [id, view] of this.views) {
            if (this.world.units.has(id)) continue;
            this.selection.forget(view);
            view.destroy();
            this.views.delete(id);
        }
    }

    /**
     * Development only (F2): spawns one of each of your faction's units in front of your HQ, so
     * movement can be tested before recruiting exists. It bypasses Commands, so never ship it.
     */
    private devSpawnArmy(): void {
        const hq = this.world.hqOf(this.humanId);
        if (!hq) return;
        const faction = gameData.faction(this.world.players.get(this.humanId)!.faction)!;
        const front = vadd(hq.position, fromAngle(hq.heading, 6000));
        formationBlock(front, faction.units.length, 2000).forEach((at, i) => this.world.spawnUnit(faction.units[i], this.humanId, at, hq.heading));
    }

    /** Ends the match and returns to the main menu. */
    exitToMenu(): void {
        this.scene.stop('Hud');
        this.scene.start('MainMenu');
    }
}
