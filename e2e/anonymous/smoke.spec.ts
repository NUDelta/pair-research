import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { enableAnonymousAuthMode } from '../helpers/auth'

function getHeader(page: Page) {
  return page.locator('header')
}

function getHeaderAuthLink(page: Page, label: 'Sign in' | 'Sign up') {
  return getHeader(page)
    .getByRole('link', { name: new RegExp(`^${label}$`, 'i') })
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
  await expect(getHeaderAuthLink(page, 'Sign in')).toBeVisible()
  await expect(getHeaderAuthLink(page, 'Sign up')).toBeVisible()
})

test('protected groups route redirects unauthenticated users to sign in and preserves the next path', async ({ page }) => {
  await page.goto('/groups')

  await expect(page).toHaveURL(/\/login\?next=%2Fgroups$/)
  await expect(page.getByRole('heading', { name: /sign in to continue/i })).toBeVisible()
})

test('sign-in page renders the current auth entry surface', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: /sign in to continue/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
  await expect(page.getByText(/complete the security check before signing in/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
})

test('sign-in page preserves the check-email notice state', async ({ page }) => {
  await page.goto('/login?notice=check-email&email=learner%40example.com')

  await expect(page.getByText(/check your inbox/i)).toBeVisible()
  await expect(page.getByText(/we sent a confirmation link to/i)).toBeVisible()
  await expect(page.getByText(/learner@example.com/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /back to sign up/i })).toBeVisible()
})

test('sign-up page renders the current email sign-up form', async ({ page }) => {
  await page.goto('/signup')

  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
  await expect(page.getByLabel('Full Name')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByPlaceholder('Create a strong password')).toBeVisible()
  await expect(page.getByText(/complete the security check before creating your account/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /^create account$/i })).toBeVisible()
})

test('sign-up page shows verification notice state and pre-fills the email', async ({ page }) => {
  await page.goto('/signup?notice=verified&email=learner%40example.com')

  await expect(page.getByText(/email verified/i)).toBeVisible()
  await expect(page.getByText(/your email has been confirmed for learner@example.com/i)).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveValue('learner@example.com')
  await expect(page.getByRole('link', { name: /go to sign in/i })).toBeVisible()
})
