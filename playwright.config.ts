import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Some environments ship a preinstalled Chromium whose build number does not
 * match the one this Playwright version expects. Point at it when it is there
 * rather than downloading a second copy; CI installs browsers normally.
 */
const preinstalledChromium =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const launch = preinstalledChromium ? { executablePath: preinstalledChromium } : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: launch } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: launch } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run start',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
