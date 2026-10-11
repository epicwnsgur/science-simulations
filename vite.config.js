import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Emit real HTML pages so direct links also work on GitHub Pages.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        friction: fileURLToPath(new URL('./simulations/friction-electricity/index.html', import.meta.url)),
      },
    },
  },
});
