import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { HudScene } from './scenes/HudScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { MatchScene } from './scenes/MatchScene';
import { MatchSetupScene } from './scenes/MatchSetupScene';

/** Client entry point: creates the Phaser game. Scene flow: Boot → MainMenu → MatchSetup → Match (+ Hud). */
const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0a1420',
    // RESIZE fits the canvas to the window. The initial size must be non-zero, or WebGL fails to boot.
    scale: { mode: Phaser.Scale.RESIZE, width: Math.max(window.innerWidth, 640), height: Math.max(window.innerHeight, 360) },
    scene: [BootScene, MainMenuScene, MatchSetupScene, MatchScene, HudScene],
});

// Development only: reach the game from the browser console, e.g. game.scene.getScene('Match').world.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
