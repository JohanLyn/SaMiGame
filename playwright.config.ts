import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run start -w @samigame/server', url: 'http://localhost:3000/health', reuseExistingServer: true },
    { command: 'npm run dev -w @samigame/host', url: 'http://localhost:5173', reuseExistingServer: true },
    { command: 'npm run dev -w @samigame/controller', url: 'http://localhost:5174', reuseExistingServer: true },
  ],
});
