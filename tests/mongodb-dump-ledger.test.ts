import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const extractor = path.join(process.cwd(), 'scripts/migration/extract-mongodb-dump-ledger.ts')

function extract(log: string) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'pair-mongo-ledger-'))
  const logPath = path.join(fixtureRoot, 'mongodump.log')
  const ledgerPath = path.join(fixtureRoot, 'ledger.tsv')
  writeFileSync(logPath, log)
  const result = spawnSync(process.execPath, [extractor, 'pair-research', logPath, ledgerPath], {
    encoding: 'utf8',
  })
  const ledger = result.status === 0 ? readFileSync(ledgerPath, 'utf8') : null
  rmSync(fixtureRoot, { force: true, recursive: true })
  return {
    ...result,
    ledger,
  }
}

describe('mongodb dump extraction ledger', () => {
  it('records dotted and empty collections after all dump output is complete', () => {
    const result = extract([
      '2026-09-22T00:00:00.000Z writing `pair-research.zero` to archive',
      '2026-09-22T00:00:00.001Z writing `pair-research.collection.with.dots` to archive',
      '2026-09-22T00:00:03.000Z done dumping `pair-research.collection.with.dots` (17 documents)',
      '2026-09-22T00:00:05.000Z done dumping `pair-research.zero` (0 documents)',
    ].join('\n'))

    expect(result.status).toBe(0)
    expect(result.ledger).toBe([
      'collection\tdocuments',
      'collection.with.dots\t17',
      'zero\t0',
      '',
    ].join('\n'))
  })

  it('waits for delayed mongodump output before creating the ledger', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'pair-mongo-backup-'))
    const binDirectory = path.join(fixtureRoot, 'bin')
    const backupRoot = path.join(fixtureRoot, 'backups')
    const mkdir = spawnSync('mkdir', ['-p', binDirectory, backupRoot])
    expect(mkdir.status).toBe(0)

    const mongodumpStub = path.join(binDirectory, 'mongodump')
    writeFileSync(mongodumpStub, `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo 'mongodump version: 100.13.0-test'
  exit 0
fi
for argument in "$@"; do
  case "$argument" in
    --archive=*) archive="\${argument#--archive=}" ;;
  esac
done
printf 'archive' | gzip -c > "$archive"
echo 'writing \`pair-research.tasks\` to archive' >&2
sleep 0.05
echo 'done dumping \`pair-research.tasks\` (4 documents)' >&2
`)
    chmodSync(mongodumpStub, 0o700)

    const backupScript = path.join(process.cwd(), 'scripts/migration/backup-mongodb.sh')
    const result = spawnSync('bash', [backupScript], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        BACKUP_ROOT: backupRoot,
        MONGODB_DATABASE: 'pair-research',
        MONGODB_SOURCE_LABEL: 'test fixture',
        MONGODB_URI: 'mongodb://fixture.invalid/pair-research',
        MONGODB_WRITES_QUIESCED: 'yes',
        PATH: `${binDirectory}:${process.env.PATH ?? ''}`,
      },
    })

    expect(result.status, result.stderr).toBe(0)
    const [backupDirectory] = readdirSync(backupRoot)
    const ledger = readFileSync(path.join(backupRoot, backupDirectory, 'backup-time-extraction-counts.tsv'), 'utf8')
    expect(ledger).toContain('tasks\t4')
    rmSync(fixtureRoot, { force: true, recursive: true })
  })

  it.each([
    {
      name: 'missing completion',
      lines: ['writing `pair-research.tasks` to archive'],
    },
    {
      name: 'malformed completion',
      lines: [
        'writing `pair-research.tasks` to archive',
        'done dumping `pair-research.tasks` (documents unavailable)',
      ],
    },
    {
      name: 'duplicate completion',
      lines: [
        'writing `pair-research.tasks` to archive',
        'done dumping `pair-research.tasks` (1 documents)',
        'done dumping `pair-research.tasks` (1 documents)',
      ],
    },
    {
      name: 'unannounced completion',
      lines: [
        'writing `pair-research.tasks` to archive',
        'done dumping `pair-research.tasks` (1 documents)',
        'done dumping `pair-research.users` (1 documents)',
      ],
    },
  ])('rejects $name', ({ lines }) => {
    const result = extract(lines.join('\n'))

    expect(result.status).not.toBe(0)
    expect(result.ledger).toBeNull()
  })
})
