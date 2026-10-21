import { defineConfig } from '@playwright/test';

// Smoke tests against the production build, at phone and desktop sizes. Run `npm run build` first
// (`npm test` does both).
export default defineConfig({
  testDir: 'tests',
  timeout: 30000,
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4174', serviceWorkers: 'block' },
  webServer: {
    command: 'npx vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: false
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } }
  ]
});
