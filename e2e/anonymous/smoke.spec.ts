import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { enableAnonymousAuthMode } from '../helpers/auth'

function getHeader(page: Page) {
  return page.locator('header')
}

function getHeaderAuthButton(page: Page, label: 'Sign in' | 'Sign up') {
  return getHeader(page)
    .locator('button')
    .filter({ hasText: new RegExp(`^${label}$`, 'i') })
    .first()
}

test.beforeEach(async ({ context, baseURL }) => {
  if (baseURL == null || baseURL === '') {
    throw new Error('Playwright baseURL is required for e2e smoke tests.')
  }

  await enableAnonymousAuthMode(context, baseURL)
})

test('homepage renders the public app shell and marketing content', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('link', { name: /pair research home/i })).toBeVisible()
  await expect(page.getByText(/Pair Research is a collaborative method/i)).toBeVisible()
  await expect(page.getByRole('img', { name: /illustration of pair research features/i })).toBeVisible()
  await expect(getHeaderAuthButton(page, 'Sign in')).toBeVisible()
  await expect(getHeaderAuthButton(page, 'Sign up')).toBeVisible()
})

test('protected groups route redirects unauthenticated users home and preserves the next path', async ({ page }) => {
  await page.goto('/groups')

  await expect(page).toHaveURL(/\/\?next=%2Fgroups$/)
  await expect(page.getByRole('link', { name: /pair research home/i })).toBeVisible()
  await expect(getHeaderAuthButton(page, 'Sign in')).toBeVisible()
})

test('sign-in dialog renders the current auth entry surface', async ({ page }) => {
  await page.goto('/')
  await getHeaderAuthButton(page, 'Sign in').click()
  const dialog = page.getByRole('dialog')

  await expect(dialog.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /sign in with google/i })).toBeVisible()
  await expect(dialog.getByLabel('Email')).toBeVisible()
  await expect(dialog.getByPlaceholder('Enter your password')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^sign in$/i }).last()).toBeVisible()
})

test('sign-up tab renders the current email sign-up form', async ({ page }) => {
  await page.goto('/')
  await getHeaderAuthButton(page, 'Sign in').click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: /^sign up$/i }).click()

  await expect(dialog.getByRole('heading', { name: 'Create account' })).toBeVisible()
  await expect(dialog.getByLabel('Full Name')).toBeVisible()
  await expect(dialog.getByLabel('Email')).toBeVisible()
  await expect(dialog.getByPlaceholder('Create a strong password')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^create account$/i }).last()).toBeVisible()
})
