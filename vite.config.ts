import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './', // CRITICAL: Makes paths relative so they work in Electron
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                panel: resolve(__dirname, 'panel.html'),
            },
        },
    }
});
