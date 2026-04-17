import type { BrowserContext } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { E2E_AUTH_ANONYMOUS_MODE, E2E_AUTH_COOKIE_NAME } from '../../src/features/auth/lib/e2eAuth'
import { TURNSTILE_E2E_BYPASS_COOKIE_NAME, TURNSTILE_E2E_BYPASS_COOKIE_VALUE } from '../../src/shared/turnstile/constants'

const helpersDir = path.dirname(fileURLToPath(import.meta.url))

export const authStorageStatePath = path.resolve(helpersDir, '../.auth/user.json')

export function getPlaywrightAuthCredentials() {
  const email = process.env.PLAYWRIGHT_AUTH_EMAIL?.trim()
  const password = process.env.PLAYWRIGHT_AUTH_PASSWORD?.trim()

  if (email == null || email === '' || password == null || password === '') {
    return null
  }

  return { email, password }
}

export async function enableAnonymousAuthMode(context: BrowserContext, baseURL: string) {
  const cookieUrl = new URL('/', baseURL).toString()

  await context.addCookies([
    {
      name: E2E_AUTH_COOKIE_NAME,
      value: E2E_AUTH_ANONYMOUS_MODE,
      url: cookieUrl,
    },
  ])
}

export async function enableTurnstileBypass(context: BrowserContext, baseURL: string) {
  const cookieUrl = new URL('/', baseURL).toString()

  await context.addCookies([
    {
      name: TURNSTILE_E2E_BYPASS_COOKIE_NAME,
      value: TURNSTILE_E2E_BYPASS_COOKIE_VALUE,
      url: cookieUrl,
    },
  ])
}
