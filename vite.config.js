import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { discoverPages, readCatalog } from './build/catalog.js';
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [{
    name: 'folder-catalog-counts',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const path = ctx.path.replace(/index\.html$/, '').replace(/\/?$/, '/');
        return readCatalog(root).transform(html, path);
      },
    },
  }],
  build: {
    rollupOptions: {
      // New grade, unit and simulation pages are included without editing this file.
      input: Object.fromEntries(discoverPages(root).map(file => [file.replace(/\/index\.html$/, '').replace(/\//g, '-'), fileURLToPath(new URL(file, import.meta.url))])),
    },
  },
});
