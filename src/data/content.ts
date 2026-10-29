import { GameData } from './registry';
import type { ContentDef } from './types';

/**
 * Bundles every JSON file under content/ at build time (Vite's import.meta.glob, which Vitest
 * supports too) and builds the GameData registry from them.
 */
export function loadGameData(): GameData {
    const files = import.meta.glob<ContentDef>('/content/**/*.json', { eager: true, import: 'default' });
    return new GameData(files);
}
