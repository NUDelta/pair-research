import { expect, test } from '@playwright/test'
import { authStorageStatePath, enableTurnstileBypass, getPlaywrightAuthCredentials } from './helpers/auth'

const authCredentials = getPlaywrightAuthCredentials()
const groupsPathPattern = /\/groups$/
const signInSubmitPattern = /^sign in$/i

test('create authenticated storage state from the email/password login flow', async ({ page, baseURL }) => {
  test.skip(authCredentials === null, 'Set PLAYWRIGHT_AUTH_EMAIL and PLAYWRIGHT_AUTH_PASSWORD to enable authenticated e2e.')

  if (baseURL == null || baseURL === '') {
    throw new Error('Playwright baseURL is required for auth setup.')
  }

  await enableTurnstileBypass(page.context(), baseURL)
  await page.goto('/login')

  await page.getByLabel('Email').fill(authCredentials!.email)
  await page.getByLabel('Password').fill(authCredentials!.password)
  await page.getByRole('button', { name: signInSubmitPattern }).last().click()

  await expect(page).toHaveURL(groupsPathPattern)
  await page.context().storageState({ path: authStorageStatePath })
})
