import { defineConfig } from '@playwright/test'
import path from 'path'

export const EXTENSION_PATH = path.join(__dirname, 'dist')

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: 1,
  // Each test launches its own Chrome persistent context with the extension loaded.
  // Run sequentially to avoid resource contention when starting multiple Chrome instances.
  workers: 1,
  // Extensions require a real (non-headless) Chromium instance.
  use: {
    headless: false,
  },
  projects: [
    {
      name: 'chrome-extension',
      use: {},
    },
  ],
})
