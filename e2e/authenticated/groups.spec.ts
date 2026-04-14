import { expect, test } from '@playwright/test'
import { authStorageStatePath, getPlaywrightAuthCredentials } from '../helpers/auth'

const authCredentials = getPlaywrightAuthCredentials()

test.skip(authCredentials === null, 'Set PLAYWRIGHT_AUTH_EMAIL and PLAYWRIGHT_AUTH_PASSWORD to enable authenticated e2e.')
test.use({ storageState: authCredentials ? authStorageStatePath : undefined })

test('authenticated user can reach the groups dashboard', async ({ page }) => {
  await page.goto('/groups')

  await expect(page).toHaveURL(/\/groups$/)
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible()
})
