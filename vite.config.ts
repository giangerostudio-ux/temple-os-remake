import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // CRITICAL: Makes paths relative so they work in Electron
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
});
