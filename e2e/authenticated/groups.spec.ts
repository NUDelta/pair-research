import { expect, test } from '@playwright/test'
import { authStorageStatePath, requirePlaywrightAuthCredentials } from '../helpers/auth'

requirePlaywrightAuthCredentials()

test.use({ storageState: authStorageStatePath })

test('authenticated user can reach the groups dashboard', async ({ page }) => {
  await page.goto('/groups')

  await expect(page).toHaveURL(/\/groups$/)
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible()
})

test('authenticated user is redirected away from auth entry pages', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/groups$/)

  await page.goto('/signup?next=%2Fgroups')
  await expect(page).toHaveURL(/\/groups$/)
})
