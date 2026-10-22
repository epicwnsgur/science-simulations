import { defineConfig } from '@playwright/test';
// 빠르기(프레임) 시험(@perf)은 다른 시험이 모두 끝난 뒤 혼자 돌려요. 여러 시험이 함께 돌면 CPU를 나눠 써서 프레임 수를 제대로 잴 수 없어요.
export default defineConfig({testDir:'./tests', use:{launchOptions:{executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium'},baseURL:'http://127.0.0.1:5173'},webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:true},
  projects:[{name:'labs',grepInvert:/@perf/},{name:'perf',grep:/@perf/,dependencies:['labs'],fullyParallel:false}]});
