import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function migration(name: string) {
  return fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', name), 'utf8')
}

function repositoryFile(name: string) {
  return fs.readFileSync(path.join(process.cwd(), name), 'utf8')
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

  it('binds DTR baselines to the reviewed production project identity', () => {
    const script = repositoryFile('scripts/migration/capture-dtr-baseline.sh')
    const connectionHelper = repositoryFile('scripts/migration/libpq-url-service.sh')
    const sql = repositoryFile('scripts/migration/capture-dtr-baseline.sql')

    expect(script).toContain('DTR_EXPECTED_PROJECT_REF')
    expect(script).toContain('resolve_supabase_connection_identity')
    expect(connectionHelper).toContain('"db.$' + '{expected_project_ref}.supabase.co"')
    expect(connectionHelper).toContain('*\'.pooler.supabase.com\'')
    expect(sql).toContain('\'source_identity\'')
    expect(sql).toContain('\'project_ref\', :\'dtr_project_ref\'')
    expect(sql).not.toContain('inet_server_addr()')
  })

  it('keeps restore and staged DTR comparisons as hard deployment gates', () => {
    const runbook = repositoryFile('docs/migration/phase-0b-deployment-runbook.md')

    expect(runbook).toContain('If either restore-evidence artifact or either provider recovery point is absent, **STOP before Stage 1**.')
    expect(runbook).toContain('Capture another production DTR baseline')
    expect(runbook).toContain('migration 3 (`...disable_data_api.sql`)')
  })

  it('checksums Mongo extraction counts and defines PostgreSQL restore equivalence', () => {
    const mongoBackup = repositoryFile('scripts/migration/backup-mongodb.sh')
    const verifier = repositoryFile('scripts/migration/verify-backup.sh')
    const postgresSummary = repositoryFile('scripts/migration/capture-postgres-restore-summary.sql')

    expect(mongoBackup).toContain('backup-time-extraction-counts.tsv')
    expect(mongoBackup).toContain('extract-mongodb-dump-ledger.ts')
    expect(mongoBackup).not.toContain('2> >(tee')
    expect(verifier).toContain('shasum -a 256 -c "$checksum_filename"')
    expect(postgresSummary).toContain('restore_acceptance_row_counts')
    expect(postgresSummary).toContain('restore_acceptance_table_fingerprints')
    expect(postgresSummary).toContain('\'table_content_fingerprint\'')
    expect(postgresSummary).toContain('\'constraint_definition\'')
    expect(postgresSummary).toContain('\'column_definition\'')
    expect(postgresSummary).toContain('\'trigger_definition\'')
    expect(postgresSummary).toContain('\'function_definition\'')
    expect(postgresSummary).toContain('\'type_definition\'')
    expect(postgresSummary).toContain('\'enum_definition\'')
    expect(postgresSummary).toContain('\'domain_constraint_definition\'')
    expect(postgresSummary).toContain('\'sequence_definition\'')
    expect(postgresSummary).toContain('\'database_definition\'')
    expect(postgresSummary).toContain('set timezone = \'UTC\'')
    expect(postgresSummary).toContain('order by row_text collate "C"')
    expect(postgresSummary).toContain('\'policy_definition\'')
    expect(postgresSummary).toContain('\'table_security\'')
    expect(postgresSummary).toContain('\'sequence_state\'')
    expect(postgresSummary).toContain('\'default_acl\'')
    expect(postgresSummary).toContain('\'pair_research_runtime_login\'')
    expect(postgresSummary).toContain('from pg_roles')
    expect(postgresSummary).not.toContain('cross join (values (\'anon\'), (\'authenticated\'), (\'service_role\'), (\'prisma\'))')

    const backupRunbook = repositoryFile('docs/migration/backup-and-restore-runbook.md')
    expect(backupRunbook).toContain('keep them quiesced until the production acceptance summary completes')
    expect(backupRunbook).toContain('does not satisfy the Phase 0B production gate')
    expect(backupRunbook).toContain('restore with ownership enabled')
    expect(backupRunbook).toContain('`--no-owner` may be used for a diagnostic restore')
  })
})
