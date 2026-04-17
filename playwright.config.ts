import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? '3000')
const baseURLFromEnv = process.env.PLAYWRIGHT_BASE_URL
const isCI = process.env.CI != null && process.env.CI !== ''
const hasExternalBaseURL = baseURLFromEnv != null && baseURLFromEnv !== ''
const baseURL = baseURLFromEnv ?? `http://127.0.0.1:${port}`
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === '1'

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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: hasExternalBaseURL
    ? undefined
    : {
        command: 'pnpm dev:e2e',
        url: baseURL,
        reuseExistingServer: !isCI && reuseExistingServer,
        timeout: 120000,
      },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/auth.setup.ts', '**/authenticated/**'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'setup-auth',
      testMatch: ['**/auth.setup.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'authenticated-chromium',
      dependencies: ['setup-auth'],
      testMatch: ['**/authenticated/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
