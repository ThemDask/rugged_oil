import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { HudScene } from './scenes/HudScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { MatchScene } from './scenes/MatchScene';
import { MatchSetupScene } from './scenes/MatchSetupScene';

/** Client entry point: creates the Phaser game. Scene flow: Boot → MainMenu → MatchSetup → Match (+ Hud). */
new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#141416',
    // RESIZE fits the canvas to the window. The initial size must be non-zero, or WebGL fails to boot.
    scale: { mode: Phaser.Scale.RESIZE, width: Math.max(window.innerWidth, 640), height: Math.max(window.innerHeight, 360) },
    scene: [BootScene, MainMenuScene, MatchSetupScene, MatchScene, HudScene],
});
