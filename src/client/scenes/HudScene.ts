import Phaser from 'phaser';
import type { Command } from '../../sim/commands';
import { gameData } from '../gameData';
import { ActionPanel, type BasicAction } from '../hud/ActionPanel';
import { hudLayout } from '../hud/layout';
import { Minimap } from '../hud/Minimap';
import { TopBar } from '../hud/TopBar';
import { UnitInspector } from '../hud/UnitInspector';
import { hexColor } from '../scale';
import { DebugOverlay } from '../ui/DebugOverlay';
import { EndScreen } from '../ui/EndScreen';
import { PauseMenu } from '../ui/PauseMenu';
import type { MatchScene } from './MatchScene';

/**
 * The in-match HUD (HLD "HUD"), a separate scene on top of the match so the match camera's zoom
 * never scales it: top bar, unit inspector, basic and advanced actions, minimap, the escape
 * menu (Esc or the Settings button) and the victory/defeat screen. Its panels swallow clicks, so
 * clicking the HUD never selects or orders on the map underneath. It reads the sim and issues
 * Commands through the match's CommandBridge, like any other input.
 */
export class HudScene extends Phaser.Scene {
    private debug!: DebugOverlay;
    private topBar!: TopBar;
    private inspector!: UnitInspector;
    private actions!: ActionPanel;
    private minimap!: Minimap;
    private menu: PauseMenu | null = null;
    private ended = false;

    constructor() {
        super('Hud');
    }

    create(): void {
        const match = this.match();
        this.menu = null;
        this.ended = false;
        match.paused = false;
        const layout = hudLayout(this.scale.width, this.scale.height);
        const map = gameData.map(match.config.mapId)!;

        this.topBar = new TopBar(this, layout.topBar, gameData.rules.resources, gameData.rules.populationCap, () => this.toggleMenu());
        this.inspector = new UnitInspector(this, layout.inspector, gameData);
        this.actions = new ActionPanel(this, layout, gameData, {
            basic: (action) => this.basicAction(action),
            recruit: (unitDefId) => this.issue({ type: 'recruit', playerId: match.humanId, unitDefId }),
            research: (upgradeId) => this.issue({ type: 'research', playerId: match.humanId, upgradeId }),
        });
        this.minimap = new Minimap(this, layout.minimap, map, match.world, match.humanId, (x, y) => match.camera.centerOn(x, y));
        this.debug = new DebugOverlay(this);

        this.input.keyboard!.on('keydown-ESC', () => this.toggleMenu());
        // Rebuild the HUD for the new screen size.
        this.scale.once('resize', () => this.scene.restart());
    }

    update(_time: number, delta: number): void {
        const match = this.match();
        const world = match.world;
        const player = world.players.get(match.humanId)!;
        const first = match.selection.selected[0]?.unit;
        const color = hexColor(match.config.players[match.humanId].color);

        this.topBar.update(player);
        this.inspector.update(first, color);
        this.actions.update(first, player.faction, color);
        this.minimap.update(delta, match.cameras.main.worldView);
        this.debug.update(this.game, world, match.selection.selected.length);

        if (world.winner >= 0 && !this.ended) {
            this.ended = true;
            this.menu?.close();
            this.menu = null;
            new EndScreen(this, world.winner === match.humanId, () => match.exitToMenu());
        }
    }

    private basicAction(action: BasicAction): void {
        const match = this.match();
        const unitIds = match.selection.selected.map((v) => v.id);
        if (unitIds.length === 0) return;
        switch (action) {
            case 'stop':
                this.issue({ type: 'stop', playerId: match.humanId, unitIds });
                break;
            case 'holdFire': {
                const holdFire = !match.selection.selected[0].unit.holdFire;
                this.issue({ type: 'holdFire', playerId: match.humanId, unitIds, holdFire });
                break;
            }
            case 'move':
            case 'attackMove':
                match.selection.setTargeting(action);
                break;
        }
    }

    private issue(command: Command): void {
        this.match().bridge.issue(command);
    }

    private toggleMenu(): void {
        const match = this.match();
        if (this.ended) return;
        if (match.selection.targeting) {
            match.selection.setTargeting(null);
            return;
        }
        if (this.menu) {
            this.menu.close();
            this.menu = null;
            match.paused = false;
            return;
        }
        match.paused = true;
        this.menu = new PauseMenu(this, () => match.exitToMenu());
    }

    private match(): MatchScene {
        return this.scene.get('Match') as MatchScene;
    }
}
