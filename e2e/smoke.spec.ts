import { expect, test } from '@playwright/test'

test('homepage renders the primary marketing content', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('link', { name: /pair research home/i })).toBeVisible()
  await expect(page.getByText(/Pair Research is a collaborative method/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

test('protected groups route redirects unauthenticated users back home', async ({ page }) => {
  await page.goto('/groups')

  await expect(page).toHaveURL(/\/\?next=%2Fgroups$/)
  await expect(page.getByText(/Pair Research is a collaborative method/i)).toBeVisible()
})
