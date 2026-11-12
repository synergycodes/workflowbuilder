import { defineConfig, devices } from '@playwright/test';

import { settings } from './src/stack/settings';

const isCi = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests',
  outputDir: settings.outputDirectory,
  globalSetup: './src/stack/global-setup.ts',
  fullyParallel: true,
  retries: 0,
  forbidOnly: isCi,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: settings.appUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
