import { readFileSync, writeFileSync } from 'node:fs'

function fail(message: string): never {
  console.error(`Error: ${message}`)
  process.exit(1)
}

const [databaseName, logPath, ledgerPath] = process.argv.slice(2)
if (!databaseName || !logPath || !ledgerPath) {
  fail('usage: extract-mongodb-dump-ledger.ts <database> <dump-log> <ledger>')
}

const namespacePrefix = `${databaseName}.`
const announcedCollections = new Set<string>()
const completedCollections = new Map<string, string>()
const log = readFileSync(logPath, 'utf8')

function collectionFromNamespace(namespace: string) {
  if (!namespace.startsWith(namespacePrefix)) {
    return null
  }

  const collection = namespace.slice(namespacePrefix.length)
  if (!collection || /[\t\r\n]/.test(collection)) {
    fail(`mongodump emitted an invalid collection name for database ${databaseName}`)
  }
  return collection
}

for (const line of log.split(/\r?\n/)) {
  const announcedMatch = line.match(/writing `([^`]*)`/)
  if (announcedMatch !== null) {
    const collection = collectionFromNamespace(announcedMatch[1])
    if (collection !== null) {
      announcedCollections.add(collection)
    }
  }

  const completedMatch = line.match(/done dumping `([^`]*)` \((\d+) documents\)/)
  if (completedMatch === null) {
    continue
  }

  const collection = collectionFromNamespace(completedMatch[1])
  if (collection === null) {
    continue
  }
  if (completedCollections.has(collection)) {
    fail(`mongodump emitted more than one completed count for ${collection}`)
  }
  completedCollections.set(collection, completedMatch[2])
}

if (announcedCollections.size === 0) {
  fail('mongodump completed without a parseable announced collection inventory')
}

for (const collection of announcedCollections) {
  if (!completedCollections.has(collection)) {
    fail(`mongodump did not emit a completed count for ${collection}`)
  }
}
for (const collection of completedCollections.keys()) {
  if (!announcedCollections.has(collection)) {
    fail(`mongodump emitted a completed count for unannounced collection ${collection}`)
  }
}

const sortedCollections = [...announcedCollections]
  .sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
const ledger = [
  'collection\tdocuments',
  ...sortedCollections.map(collection => `${collection}\t${completedCollections.get(collection)}`),
  '',
].join('\n')

writeFileSync(ledgerPath, ledger, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
