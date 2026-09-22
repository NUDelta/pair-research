import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createBuildEnvironment } from '../scripts/secure-build'

const script = path.join(process.cwd(), 'scripts/verify-build-artifacts.ts')

function runFixture(files: Record<string, string>, canary = '') {
  const root = mkdtempSync(path.join(tmpdir(), 'pair-build-scan-'))
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath)
    mkdirSync(path.dirname(absolutePath), { recursive: true })
    writeFileSync(absolutePath, contents)
  }

  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, BUILD_SECRET_SCAN_CANARIES: canary },
  })

  return { result, root }
}

describe('build artifact security verification', () => {
  it('removes runtime and deployment credentials from the Vite child environment', () => {
    const environment = createBuildEnvironment({
      PATH: '/usr/bin',
      VITE_SITE_BASE_URL: 'https://pairresearch.io',
      DATABASE_URL: 'runtime-database-canary',
      SUPABASE_SECRET_KEY: 'service-role-canary',
      GROUP_SESSION_SIGNING_SECRET: 'session-signing-canary',
      CLOUDFLARE_API_TOKEN: 'deployment-token-canary',
    })

    expect(environment).toMatchObject({
      PATH: '/usr/bin',
      VITE_SITE_BASE_URL: 'https://pairresearch.io',
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
    })
    expect(environment.DATABASE_URL).toBeUndefined()
    expect(environment.SUPABASE_SECRET_KEY).toBeUndefined()
    expect(environment.GROUP_SESSION_SIGNING_SECRET).toBeUndefined()
    expect(environment.CLOUDFLARE_API_TOKEN).toBeUndefined()
  })

  it('accepts ordinary build output', () => {
    const { result } = runFixture({
      'dist/server/index.js': 'export default {}',
      'dist/server/wrangler.json': '{}',
    })

    expect(result.status).toBe(0)
  })

  it('fails closed when the expected deploy entry is missing', () => {
    const { result } = runFixture({ 'dist/server/index.js': 'export default {}' })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('required deploy entry is missing')
  })

  it('rejects secret environment files without printing their contents', () => {
    const { result, root } = runFixture({
      'dist/server/.dev.vars': 'DATABASE_URL=do-not-print',
      'dist/server/wrangler.json': '{}',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('forbidden secret-file pattern')
    expect(result.stderr).not.toContain('do-not-print')
    expect(existsSync(path.join(root, 'dist/server/.dev.vars'))).toBe(false)
  })

  it.each([
    '.npmrc',
    '.yarnrc.yml',
    '.netrc',
    'signing.p8',
    'signing.pkcs8',
    'id_rsa',
    'id_ed25519',
    'secrets.json',
    'secret.yaml',
  ])('rejects and removes credential artifact %s without logging contents', (basename) => {
    const contents = 'credential-canary-that-must-not-be-logged'
    const { result, root } = runFixture({
      [`dist/server/${basename}`]: contents,
      'dist/server/wrangler.json': '{}',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('forbidden secret-file pattern')
    expect(result.stderr).not.toContain(contents)
    expect(existsSync(path.join(root, 'dist/server', basename))).toBe(false)
  })

  it('rejects secret canaries embedded in output', () => {
    const { result, root } = runFixture({
      'dist/server/index.js': 'const leaked = "unique-runtime-secret"',
      'dist/server/wrangler.json': '{}',
    }, 'unique-runtime-secret')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('secret canary found')
    expect(result.stderr).not.toContain('unique-runtime-secret')
    expect(existsSync(path.join(root, 'dist/server/index.js'))).toBe(false)
  })

  it('scans large and binary files for canaries', () => {
    const binary = `${'x'.repeat(5 * 1024 * 1024)}\0unique-runtime-secret`
    const { result } = runFixture({
      'dist/server/archive.bin': binary,
      'dist/server/wrangler.json': '{}',
    }, 'unique-runtime-secret')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('secret canary found')
  })
})
