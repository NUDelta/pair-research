import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const port = 3000
const rootDir = path.dirname(fileURLToPath(import.meta.url))
const baseURLFromEnv = process.env.PLAYWRIGHT_BASE_URL
const authStorageStatePathFromEnv = process.env.PLAYWRIGHT_STORAGE_STATE
const isCI = process.env.CI != null && process.env.CI !== ''
const hasExternalBaseURL = baseURLFromEnv != null && baseURLFromEnv !== ''
const baseURL = baseURLFromEnv ?? `http://127.0.0.1:${port}`
const authStorageStatePath = authStorageStatePathFromEnv
  ?? path.resolve(rootDir, 'e2e/.auth/user.json')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'output/playwright/report' }],
  ],
  outputDir: 'output/playwright/test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: fs.existsSync(authStorageStatePath)
      ? authStorageStatePath
      : undefined,
  },
  webServer: hasExternalBaseURL
    ? undefined
    : {
        command: 'pnpm dev:test',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120000,
      },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
