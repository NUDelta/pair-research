import fs from 'node:fs'
import process from 'node:process'

const environmentName = process.argv[2]
const destination = process.argv[3]

if (environmentName === undefined || destination === undefined) {
  throw new Error('Expected an environment-variable name and destination path.')
}

const source = process.env[environmentName]
if (source === undefined || source.length === 0) {
  throw new Error(`Missing connection URL in ${environmentName}.`)
}

const url = new URL(source)
if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
  throw new Error('PostgreSQL connection URL must use postgres:// or postgresql://.')
}

function serviceValue(value: string) {
  if (value.includes('\n') || value.includes('\r')) {
    throw new Error('PostgreSQL connection values must not contain newlines.')
  }
  return value
}

const database = decodeURIComponent(url.pathname.replace(/^\//, ''))
if (url.hostname.length === 0 || database.length === 0) {
  throw new Error('PostgreSQL connection URL must include a host and database name.')
}

const entries = new Map<string, string>([
  ['host', url.hostname],
  ['dbname', database],
])
if (url.port.length > 0) {
  entries.set('port', url.port)
}
if (url.username.length > 0) {
  entries.set('user', decodeURIComponent(url.username))
}
const password = url.password.length > 0 ? decodeURIComponent(url.password) : null

for (const name of ['application_name', 'connect_timeout', 'options', 'sslcert', 'sslkey', 'sslmode', 'sslrootcert']) {
  const value = url.searchParams.get(name)
  if (value !== null) {
    entries.set(name, value)
  }
}

const contents = [
  '[pair_research_ephemeral]',
  ...[...entries].map(([name, value]) => `${name}=${serviceValue(value)}`),
  '',
].join('\n')

fs.writeFileSync(destination, contents, { encoding: 'utf8', mode: 0o600 })

if (password !== null) {
  const pgpassPath = `${destination}.pgpass`
  const escapePgpass = (value: string) => serviceValue(value).replaceAll('\\', '\\\\').replaceAll(':', '\\:')
  const pgpass = [url.hostname, url.port || '5432', database, decodeURIComponent(url.username), password]
    .map(escapePgpass)
    .join(':')
  fs.writeFileSync(pgpassPath, `${pgpass}\n`, { encoding: 'utf8', mode: 0o600 })
  fs.appendFileSync(destination, `passfile=${serviceValue(pgpassPath)}\n`)
}
