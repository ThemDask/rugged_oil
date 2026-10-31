import { defineConfig } from 'vitest/config';

// Tests run in plain Node. Only src/sim, src/data and src/setup are tested directly: they must
// never import Phaser, which tests/architecture.test.ts enforces.
export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        environment: 'node',
        // The on-disk module cache keys a file by its own content, so it misses new files matched
        // by import.meta.glob (src/data/content.ts loads content/**/*.json): adding a content file
        // would leave tests running on the old list. Keep it off.
        fsModuleCache: false,
    },
});
