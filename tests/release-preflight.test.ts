import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const validReleaseEnv = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  VITE_SITE_BASE_URL: 'https://pairresearch.io',
  VITE_CLOUDFLARE_TURNSTILE_SITE_KEY: 'turnstile-site',
  VITE_GOOGLE_CLIENT_ID: 'google-client-id',
  R2_PUBLIC_DOMAIN: 'https://r2.pairresearch.io',
  DATABASE_URL: 'postgresql://user:pass@example.com:5432/db',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  CLOUDFLARE_TURNSTILE_SECRET_KEY: 'turnstile-secret',
  CONTACT_ADMIN_EMAIL: 'admin@example.com',
  CONTACT_FROM_EMAIL: 'Pair Research <support@notify.pairresearch.io>',
  RESEND_API_KEY: 're_test',
  FORCE_COLOR: '0',
}

const repoRoot = process.cwd()
const releasePreflightScript = path.join(repoRoot, 'scripts/release-preflight.ts')

function runReleasePreflight(env: NodeJS.ProcessEnv = validReleaseEnv, cwd = repoRoot) {
  return spawnSync(process.execPath, [releasePreflightScript], {
    cwd,
    encoding: 'utf8',
    env,
  })
}

function writeFixtureFile(root: string, relativePath: string, contents: string) {
  const absolutePath = path.join(root, relativePath)
  mkdirSync(path.dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, contents)
}

function createReleasePreflightFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'pair-release-preflight-'))

  writeFixtureFile(root, 'wrangler.jsonc', JSON.stringify({
    name: 'pair-research',
    workers_dev: false,
    preview_urls: true,
    secrets: {
      required: [
        'CLOUDFLARE_TURNSTILE_SECRET_KEY',
        'CONTACT_ADMIN_EMAIL',
        'CONTACT_FROM_EMAIL',
        'DATABASE_URL',
        'RESEND_API_KEY',
        'SUPABASE_SECRET_KEY',
      ],
    },
    r2_buckets: [{
      binding: 'R2_BUCKET',
      bucket_name: 'pair-research',
      remote: true,
    }],
    durable_objects: {
      bindings: [{
        name: 'GROUP_SESSIONS',
        class_name: 'GroupSessionDO',
      }],
    },
    migrations: [{
      new_sqlite_classes: ['GroupSessionDO'],
    }],
    routes: [
      { pattern: 'pairresearch.io' },
      { pattern: 'www.pairresearch.io' },
    ],
  }))

  writeFixtureFile(root, '.github/workflows/deploy-production.yml', `
env:
  VITE_SUPABASE_URL: \${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_PUBLISHABLE_KEY: \${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
  VITE_SITE_BASE_URL: \${{ secrets.VITE_SITE_BASE_URL }}
  VITE_CLOUDFLARE_TURNSTILE_SITE_KEY: \${{ secrets.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY }}
  VITE_GOOGLE_CLIENT_ID: \${{ secrets.VITE_GOOGLE_CLIENT_ID }}
  R2_PUBLIC_DOMAIN: \${{ secrets.R2_PUBLIC_DOMAIN }}
  DATABASE_URL: \${{ secrets.DATABASE_URL }}
  SUPABASE_SECRET_KEY: \${{ secrets.SUPABASE_SECRET_KEY }}
  CLOUDFLARE_TURNSTILE_SECRET_KEY: \${{ secrets.CLOUDFLARE_TURNSTILE_SECRET_KEY }}
  CONTACT_ADMIN_EMAIL: \${{ secrets.CONTACT_ADMIN_EMAIL }}
  CONTACT_FROM_EMAIL: \${{ secrets.CONTACT_FROM_EMAIL }}
  RESEND_API_KEY: \${{ secrets.RESEND_API_KEY }}
  CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
steps:
  - run: pnpm run release:preflight
  - run: pnpm run lint:ci
  - run: pnpm run test
  - run: pnpm run build
  - run: wrangler deploy --keep-vars
`)
  writeFixtureFile(root, '.github/workflows/pr-checks.yml', `
env:
  VITE_SUPABASE_URL: https://example.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci
  VITE_SITE_BASE_URL: https://pairresearch.io
  VITE_CLOUDFLARE_TURNSTILE_SITE_KEY: turnstile-site
  VITE_GOOGLE_CLIENT_ID: google-client-id
  R2_PUBLIC_DOMAIN: https://r2.pairresearch.io
steps:
  - run: pnpm run release:preflight
  - run: pnpm run lint:ci
  - run: pnpm run test
  - run: pnpm run build
`)
  writeFixtureFile(root, 'supabase/migrations/00000000000000_fixture.sql', '-- fixture')
  writeFixtureFile(root, 'src/shared/seo/config.ts', `
export const routes = [
  { path: '/' },
  { path: '/contact' },
  { path: '/privacy' },
  { path: '/terms' },
]
`)

  for (const routeFile of [
    'src/routes/index.tsx',
    'src/routes/_authed/account.tsx',
    'src/routes/contact.tsx',
    'src/routes/forgot-password.tsx',
    'src/routes/_authed/groups/index.tsx',
    'src/routes/_authed/groups/create.tsx',
    'src/routes/login.tsx',
    'src/routes/privacy.tsx',
    'src/routes/reset-password.tsx',
    'src/routes/signup.tsx',
    'src/routes/terms.tsx',
  ]) {
    writeFixtureFile(root, routeFile, '')
  }

  return root
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

  it('rejects missing public build values required by the client build', () => {
    const fixtureRoot = createReleasePreflightFixture()
    const result = runReleasePreflight({
      ...validReleaseEnv,
      VITE_GOOGLE_CLIENT_ID: '',
    }, fixtureRoot)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Missing required public build environment value: VITE_GOOGLE_CLIENT_ID')
  })

  it('rejects missing public runtime values required by server code', () => {
    const fixtureRoot = createReleasePreflightFixture()
    const result = runReleasePreflight({
      ...validReleaseEnv,
      R2_PUBLIC_DOMAIN: '',
    }, fixtureRoot)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Missing required public runtime environment value: R2_PUBLIC_DOMAIN')
  })

  it('rejects committed Wrangler vars', () => {
    const fixtureRoot = createReleasePreflightFixture()
    writeFixtureFile(fixtureRoot, 'wrangler.jsonc', JSON.stringify({
      name: 'pair-research',
      workers_dev: false,
      preview_urls: true,
      vars: {
        VITE_SUPABASE_URL: 'https://example.supabase.co',
      },
      secrets: {
        required: [
          'CLOUDFLARE_TURNSTILE_SECRET_KEY',
          'CONTACT_ADMIN_EMAIL',
          'CONTACT_FROM_EMAIL',
          'DATABASE_URL',
          'RESEND_API_KEY',
          'SUPABASE_SECRET_KEY',
        ],
      },
      r2_buckets: [{
        binding: 'R2_BUCKET',
        bucket_name: 'pair-research',
        remote: true,
      }],
      durable_objects: {
        bindings: [{
          name: 'GROUP_SESSIONS',
          class_name: 'GroupSessionDO',
        }],
      },
      migrations: [{
        new_sqlite_classes: ['GroupSessionDO'],
      }],
      routes: [
        { pattern: 'pairresearch.io' },
        { pattern: 'www.pairresearch.io' },
      ],
    }))
    const result = runReleasePreflight(validReleaseEnv, fixtureRoot)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('wrangler.jsonc must not define vars; configure public build values through Vite environment variables.')
  })
})
