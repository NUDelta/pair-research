import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('group session signing secret boundary', () => {
  it('uses only the dedicated signing secret in issuer and verifier entry points', () => {
    const issuer = fs.readFileSync('src/features/groups/server/groupSessionToken.ts', 'utf8')
    const verifier = fs.readFileSync('src/server.ts', 'utf8')
    const wrangler = fs.readFileSync('wrangler.jsonc', 'utf8')

    expect(issuer).toContain('getRequiredServerEnv(\'GROUP_SESSION_SIGNING_SECRET\')')
    expect(verifier).toContain('env.GROUP_SESSION_SIGNING_SECRET')
    expect(wrangler).toContain('"GROUP_SESSION_SIGNING_SECRET"')
    expect(issuer).not.toContain('getRequiredServerEnv(\'SUPABASE_SECRET_KEY\')')
    expect(verifier).not.toContain('env.SUPABASE_SECRET_KEY')
  })
})
