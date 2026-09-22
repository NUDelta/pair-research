import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function migration(name: string) {
  return fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', name), 'utf8')
}

describe('phase 0B security migrations', () => {
  it('creates runtime roles without privileged capabilities', () => {
    const sql = migration('20260921181000_phase_0b_runtime_role.sql')

    expect(sql).toContain('nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls')
    expect(sql).toContain('grant pair_research_runtime to pair_research_runtime_login')
    expect(sql).toContain('set lock_timeout = \'5s\'')
  })

  it('drops non-runtime policies and revokes every Data API application role', () => {
    const sql = migration('20260921181200_phase_0b_disable_data_api.sql')

    expect(sql).toContain('policyname not like \'pair_research_runtime_%\'')
    expect(sql).toContain('from public, anon, authenticated, service_role')
    expect(sql.toLowerCase()).not.toContain('to public')
  })

  it('keeps migration_private inaccessible to runtime and Data API roles', () => {
    const sql = migration('20260921181300_phase_0b_migration_private_foundation.sql')

    expect(sql).toContain('create role migration_private_owner')
    expect(sql).toContain('revoke migration_private_owner from pair_research_runtime, pair_research_runtime_login')
    expect(sql).toContain('public, anon, authenticated, service_role, pair_research_runtime, pair_research_runtime_login')
  })

  it('tracks invitation provisioning without storing recipient email addresses', () => {
    const sql = migration('20260921181100_phase_0b_invitation_rate_limits.sql')

    expect(sql).toContain('create table public.invitation_security_event')
    expect(sql).toContain('operation_id uuid not null')
    expect(sql).toContain('request_digest text not null')
    expect(sql).toContain('recipient_hash text')
    expect(sql).toContain('\'auth_provisioned\', \'membership_created\'')
    expect(sql).not.toContain('recipient_email')
  })
})
