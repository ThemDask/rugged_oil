import { defineConfig } from 'vite';

// Client dev server and production bundle. The output in dist/ is plain HTML/JS, ready for a
// browser or an Electron wrapper. `base: './'` keeps asset paths relative, which Electron needs.
export default defineConfig({
    base: './',
    server: { port: 8080 },
    build: {
        outDir: 'dist',
        // Phaser alone is ~1.2 MB; don't warn about it.
        chunkSizeWarningLimit: 2000,
    },
});
