import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readdirSync, existsSync } from 'node:fs';

const page = path => fileURLToPath(new URL(path, import.meta.url));
// simulations/ 아래의 모든 실험 폴더를 빌드 입력에 자동으로 넣습니다.
const simulations = readdirSync(page('./simulations'), { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(page(`./simulations/${d.name}/index.html`)))
  .map(d => [`sim-${d.name}`, page(`./simulations/${d.name}/index.html`)]);

// Emit real HTML pages so direct links also work on GitHub Pages.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        home: page('./index.html'),
        grade2: page('./grades/middle-school-2/index.html'),
        ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`unit${i + 1}`, page(`./grades/middle-school-2/unit-${i + 1}/index.html`)])),
        ...Object.fromEntries(simulations),
      },
    },
  },
});
