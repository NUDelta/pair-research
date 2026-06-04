import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const validReleaseEnv = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  VITE_SITE_BASE_URL: 'https://pairresearch.io',
  R2_PUBLIC_DOMAIN: 'https://r2.pairresearch.io',
  DATABASE_URL: 'postgresql://user:pass@example.com:5432/db',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  VITE_CLOUDFLARE_TURNSTILE_SITE_KEY: 'turnstile-site',
  CLOUDFLARE_TURNSTILE_SECRET_KEY: 'turnstile-secret',
  CONTACT_ADMIN_EMAIL: 'admin@example.com',
  CONTACT_FROM_EMAIL: 'Pair Research <support@notify.pairresearch.io>',
  RESEND_API_KEY: 're_test',
  FORCE_COLOR: '0',
}

function runReleasePreflight(env: NodeJS.ProcessEnv = validReleaseEnv) {
  return spawnSync(process.execPath, ['scripts/release-preflight.ts'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env,
  })
}

describe('release preflight', () => {
  it('passes with a sender on the notify.pairresearch.io domain', () => {
    const result = runReleasePreflight()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Release preflight passed.')
  })

  it('rejects contact sender domains that only contain the required domain as a substring', () => {
    const result = runReleasePreflight({
      ...validReleaseEnv,
      CONTACT_FROM_EMAIL: 'Pair Research <support@notify.pairresearch.io.evil>',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('CONTACT_FROM_EMAIL must use the notify.pairresearch.io sending domain.')
  })
})
