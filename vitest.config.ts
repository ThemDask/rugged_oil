import { defineConfig } from 'vitest/config';

// Tests run in plain Node. Only src/sim, src/data and src/setup are tested directly: they must
// never import Phaser, which tests/architecture.test.ts enforces.
export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        environment: 'node',
    },
});
