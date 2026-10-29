import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Enforces the architecture rules that keep the simulation deterministic and engine-free:
 * src/sim, src/data and src/setup never import Phaser or client code, and the simulation never
 * uses float library maths, wall-clock time or unseeded randomness.
 */
const ENGINE_FREE = ['src/sim', 'src/data', 'src/setup', 'src/ai'];
const FORBIDDEN_IN_SIM = ['Math.random', 'Math.sin', 'Math.cos', 'Math.tan', 'Math.atan', 'Math.sqrt', 'Math.pow', 'Math.hypot', 'Math.exp', 'Math.log', 'Date.now', 'new Date', 'performance.now'];

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
    });
}

describe('architecture', () => {
    it.each(ENGINE_FREE)('%s does not import Phaser or client code', (dir) => {
        for (const file of sourceFiles(dir)) {
            const text = readFileSync(file, 'utf8');
            expect(text, file).not.toMatch(/from ['"]phaser['"]/);
            expect(text, file).not.toMatch(/from ['"][^'"]*client\//);
        }
    });

    it('src/sim uses no non-deterministic APIs', () => {
        for (const file of sourceFiles('src/sim')) {
            const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
            for (const api of FORBIDDEN_IN_SIM) expect(code.includes(api), `${file} uses ${api}`).toBe(false);
        }
    });
});
