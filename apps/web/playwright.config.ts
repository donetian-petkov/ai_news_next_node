import path from 'node:path';
import { defineConfig } from '@playwright/test';

const repoRoot = path.resolve(__dirname, '../..');
const hasExternalBaseUrl = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'retain-on-failure'
  },
  webServer: hasExternalBaseUrl
    ? undefined
    : [
      {
        command: 'npm run dev:api',
        cwd: repoRoot,
        port: 4000,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          AI_ENABLED: 'false'
        }
      },
      {
        command: 'npm run dev:web',
        cwd: repoRoot,
        port: 3000,
        reuseExistingServer: !process.env.CI
      }
    ]
});
