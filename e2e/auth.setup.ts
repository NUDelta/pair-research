import { expect, test } from '@playwright/test'
import { authStorageStatePath, getPlaywrightAuthCredentials } from './helpers/auth'

const authCredentials = getPlaywrightAuthCredentials()
const groupsPathPattern = /\/groups$/
const signInTriggerPattern = /^Sign in$/i
const signInSubmitPattern = /^sign in$/i

test('create authenticated storage state from the email/password login flow', async ({ page }) => {
  test.skip(authCredentials === null, 'Set PLAYWRIGHT_AUTH_EMAIL and PLAYWRIGHT_AUTH_PASSWORD to enable authenticated e2e.')

  await page.goto('/')
  await page.locator('header').locator('button').filter({ hasText: signInTriggerPattern }).first().click()

  await page.getByLabel('Email').fill(authCredentials!.email)
  await page.getByLabel('Password').fill(authCredentials!.password)
  await page.getByRole('button', { name: signInSubmitPattern }).last().click()

  await expect(page).toHaveURL(groupsPathPattern)
  await page.context().storageState({ path: authStorageStatePath })
})
