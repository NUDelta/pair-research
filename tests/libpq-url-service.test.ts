import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('libpq URL service helper', () => {
  it('removes temporary service and pass files when the writer fails', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'pair-libpq-helper-'))
    const binDirectory = path.join(fixtureRoot, 'bin')
    const temporaryDirectory = path.join(fixtureRoot, 'tmp')
    const mkdir = spawnSync('mkdir', ['-p', binDirectory, temporaryDirectory])
    expect(mkdir.status).toBe(0)

    const nodeStub = path.join(binDirectory, 'node')
    writeFileSync(nodeStub, '#!/bin/sh\n: > "$3.pgpass"\nexit 7\n')
    chmodSync(nodeStub, 0o700)

    const helper = path.join(process.cwd(), 'scripts/migration/libpq-url-service.sh')
    const result = spawnSync('bash', ['-c', `
      set -euo pipefail
      source "$HELPER"
      export TEST_DATABASE_URL='postgresql://user:password@example.test/postgres'
      if configure_libpq_connection TEST_DATABASE_URL; then
        exit 9
      fi
    `], {
      encoding: 'utf8',
      env: {
        ...process.env,
        HELPER: helper,
        PATH: `${binDirectory}:${process.env.PATH ?? ''}`,
        TMPDIR: temporaryDirectory,
      },
    })

    expect(result.status).toBe(0)
    expect(readdirSync(temporaryDirectory)).toEqual([])
  })

  it.each([
    {
      name: 'direct project host',
      conninfo: 'You are connected to database "postgres" as user "postgres" on host "db.twnurskjzrelsaptkblt.supabase.co" at port "5432".',
      expected: 'direct\tpostgres\tdb.twnurskjzrelsaptkblt.supabase.co',
    },
    {
      name: 'regional pooler with project-qualified user',
      conninfo: 'You are connected to database "postgres" as user "pair_research_runtime_login.twnurskjzrelsaptkblt" on host "aws-0-us-east-1.pooler.supabase.com" (address "192.0.2.10") at port "6543".\nSSL connection (protocol: TLSv1.3, cipher: test, compression: off, ALPN: none)',
      expected: 'pooler\tpair_research_runtime_login.twnurskjzrelsaptkblt\taws-0-us-east-1.pooler.supabase.com',
    },
  ])('accepts an exact Supabase $name identity', ({ conninfo, expected }) => {
    const helper = path.join(process.cwd(), 'scripts/migration/libpq-url-service.sh')
    const result = spawnSync('bash', ['-c', `
      set -euo pipefail
      source "$HELPER"
      resolve_supabase_connection_identity "$CONNINFO" twnurskjzrelsaptkblt
    `], {
      encoding: 'utf8',
      env: { ...process.env, HELPER: helper, CONNINFO: conninfo },
    })

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe(expected)
  })

  it.each([
    'You are connected to database "postgres" as user "postgres" on host "db.twnurskjzrelsaptkblt.supabase.co.attacker.test" at port "5432".',
    'You are connected to database "postgres" as user "postgres.twnurskjzrelsaptkblt.attacker" on host "aws-0-us-east-1.pooler.supabase.com" at port "6543".',
    'You are connected to database "postgres" as user "postgres.wrongprojectref0000" on host "aws-0-us-east-1.pooler.supabase.com" at port "6543".',
    'You are connected to database "postgres" as user "postgres.twnurskjzrelsaptkblt" on host "pooler.supabase.com.attacker.test" at port "6543".',
    'You are connected to database "fake as user "postgres" on host "db.twnurskjzrelsaptkblt.supabase.co" at port "5432"." as user "attacker" on host "attacker.test" at port "5432".',
    'prefix You are connected to database "postgres" as user "postgres" on host "db.twnurskjzrelsaptkblt.supabase.co" at port "5432".',
    'You are connected to database "postgres" as user "postgres" on host "db.twnurskjzrelsaptkblt.supabase.co" at port "5432". trailing text',
  ])('rejects a non-exact project identity: %s', (conninfo) => {
    const helper = path.join(process.cwd(), 'scripts/migration/libpq-url-service.sh')
    const result = spawnSync('bash', ['-c', `
      set -euo pipefail
      source "$HELPER"
      resolve_supabase_connection_identity "$CONNINFO" twnurskjzrelsaptkblt
    `], {
      encoding: 'utf8',
      env: { ...process.env, HELPER: helper, CONNINFO: conninfo },
    })

    expect(result.status).not.toBe(0)
    expect(result.stdout).toBe('')
  })
})
