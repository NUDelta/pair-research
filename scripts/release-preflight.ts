import type { WranglerPublicVarName } from './wrangler-public-vars.ts'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { config as loadDotenv } from 'dotenv'
import {
  readWranglerPublicVarsConfig,
  REQUIRED_WRANGLER_PUBLIC_VARS,
  stripJsonComments,
} from './wrangler-public-vars.ts'

loadDotenv({ path: '.env', quiet: true })

const REQUIRED_RELEASE_ENV_VALUES = [
  'DATABASE_URL',
  'SUPABASE_SECRET_KEY',
  'CLOUDFLARE_TURNSTILE_SECRET_KEY',
  'CONTACT_ADMIN_EMAIL',
  'CONTACT_FROM_EMAIL',
  'RESEND_API_KEY',
] as const

const REQUIRED_DEPLOYMENT_SECRETS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
] as const

const REQUIRED_WORKER_SECRETS = [
  'CLOUDFLARE_TURNSTILE_SECRET_KEY',
  'CONTACT_ADMIN_EMAIL',
  'CONTACT_FROM_EMAIL',
  'DATABASE_URL',
  'RESEND_API_KEY',
  'SUPABASE_SECRET_KEY',
] as const

const REQUIRED_PUBLIC_ROUTES = ['/', '/contact', '/privacy', '/terms'] as const
const REQUIRED_PR_CHECK_COMMANDS = [
  'pnpm run release:preflight',
  'pnpm run lint:ci',
  'pnpm run test',
  'pnpm run build',
] as const
const REQUIRED_PRODUCTION_DEPLOY_COMMANDS = [
  'pnpm run release:preflight',
  'pnpm run lint:ci',
  'pnpm run test',
  'pnpm run build',
] as const
const ROUTE_FILE_BY_PUBLIC_PATH: Record<string, string> = {
  '/': 'src/routes/index.tsx',
  '/account': 'src/routes/_authed/account.tsx',
  '/contact': 'src/routes/contact.tsx',
  '/forgot-password': 'src/routes/forgot-password.tsx',
  '/groups': 'src/routes/_authed/groups/index.tsx',
  '/groups/$slug': 'src/routes/_authed/groups/$slug/index.tsx',
  '/groups/$slug/settings': 'src/routes/_authed/groups/$slug/settings.tsx',
  '/groups/create': 'src/routes/_authed/groups/create.tsx',
  '/login': 'src/routes/login.tsx',
  '/privacy': 'src/routes/privacy.tsx',
  '/reset-password': 'src/routes/reset-password.tsx',
  '/signup': 'src/routes/signup.tsx',
  '/terms': 'src/routes/terms.tsx',
}

const REPO_ROOT = process.cwd()

interface WranglerConfig {
  name?: string
  workers_dev?: boolean
  preview_urls?: boolean
  vars?: Record<string, unknown>
  secrets?: {
    required?: string[]
  }
  r2_buckets?: Array<{
    binding?: string
    bucket_name?: string
    remote?: boolean
  }>
  durable_objects?: {
    bindings?: Array<{
      name?: string
      class_name?: string
    }>
  }
  migrations?: Array<{
    new_sqlite_classes?: string[]
  }>
  routes?: Array<{
    pattern?: string
  }>
}

function readText(relativePath: string) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8')
}

function readJsonc(relativePath: string): WranglerConfig {
  return JSON.parse(stripJsonComments(readText(relativePath))) as WranglerConfig
}

function listFiles(directory: string, extensions: readonly string[]) {
  const absoluteDirectory = path.join(REPO_ROOT, directory)
  const files: string[] = []

  if (!fs.existsSync(absoluteDirectory)) {
    return files
  }

  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const absolutePath = path.join(absoluteDirectory, entry.name)
    if (entry.isDirectory()) {
      files.push(...listFiles(path.relative(REPO_ROOT, absolutePath), extensions))
    }
    else if (
      entry.isFile()
      && extensions.some(extension => entry.name.endsWith(extension))
      && !entry.name.includes('.test.')
    ) {
      files.push(path.relative(REPO_ROOT, absolutePath))
    }
  }

  return files
}

function hasEnvValue(name: string) {
  return typeof process.env[name] === 'string' && process.env[name].trim() !== ''
}

function parseUrl(name: string, value: string) {
  try {
    return new URL(value)
  }
  catch {
    throw new Error(`${name} must be a valid URL.`)
  }
}

function extractEmailAddress(value: string) {
  const trimmedValue = value.trim()
  const angleAddress = trimmedValue.match(/<([^<>]+)>$/)?.[1]?.trim()
  return angleAddress ?? trimmedValue
}

function getEmailDomain(value: string) {
  const email = extractEmailAddress(value)
  const parts = email.split('@')
  return parts.length === 2 ? parts[1].toLowerCase() : ''
}

const failures: string[] = []

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message)
  }
}

for (const name of REQUIRED_RELEASE_ENV_VALUES) {
  assert(hasEnvValue(name), `Missing required release environment value: ${name}`)
}

const wrangler = readJsonc('wrangler.jsonc')
const wranglerPublicVars = readWranglerPublicVarsConfig(REPO_ROOT)

function getWranglerVarString(name: WranglerPublicVarName) {
  const value = wranglerPublicVars.vars?.[name]
  return typeof value === 'string' ? value.trim() : ''
}

assert(wrangler.name === 'pair-research', 'wrangler.jsonc must target the pair-research Worker.')
assert(wrangler.workers_dev === false, 'wrangler.jsonc must keep workers_dev disabled for production.')
assert(wrangler.preview_urls === true, 'wrangler.jsonc must keep preview_urls enabled for Worker diagnostics.')

for (const name of REQUIRED_WRANGLER_PUBLIC_VARS) {
  assert(getWranglerVarString(name) !== '', `wrangler.jsonc is missing required var: ${name}`)
}

if (getWranglerVarString('VITE_SITE_BASE_URL') !== '') {
  const siteUrl = parseUrl('VITE_SITE_BASE_URL', getWranglerVarString('VITE_SITE_BASE_URL'))
  assert(siteUrl.protocol === 'https:', 'VITE_SITE_BASE_URL must use https for release.')
}

if (getWranglerVarString('R2_PUBLIC_DOMAIN') !== '') {
  const r2Url = parseUrl('R2_PUBLIC_DOMAIN', getWranglerVarString('R2_PUBLIC_DOMAIN'))
  assert(r2Url.protocol === 'https:', 'R2_PUBLIC_DOMAIN must use https for release.')
}

if (getWranglerVarString('VITE_SUPABASE_URL') !== '') {
  const supabaseUrl = parseUrl('VITE_SUPABASE_URL', getWranglerVarString('VITE_SUPABASE_URL'))
  assert(supabaseUrl.protocol === 'https:', 'VITE_SUPABASE_URL must use https.')
}

if (hasEnvValue('CONTACT_FROM_EMAIL')) {
  assert(getEmailDomain(process.env.CONTACT_FROM_EMAIL) === 'notify.pairresearch.io', 'CONTACT_FROM_EMAIL must use the notify.pairresearch.io sending domain.')
}

if (hasEnvValue('CONTACT_ADMIN_EMAIL')) {
  assert(process.env.CONTACT_ADMIN_EMAIL.includes('@'), 'CONTACT_ADMIN_EMAIL must be an email address.')
}

for (const name of REQUIRED_WORKER_SECRETS) {
  assert(wrangler.secrets?.required?.includes(name) === true, `wrangler.jsonc secrets.required is missing: ${name}`)
}

const r2Binding = wrangler.r2_buckets?.find(binding => binding.binding === 'R2_BUCKET')
assert(r2Binding !== undefined, 'wrangler.jsonc is missing R2_BUCKET binding.')
assert(r2Binding?.bucket_name === 'pair-research', 'R2_BUCKET must point to the pair-research bucket.')
assert(r2Binding?.remote === true, 'R2_BUCKET must be marked remote for deployed Worker usage.')

const durableObjectBinding = wrangler.durable_objects?.bindings?.find(binding => binding.name === 'GROUP_SESSIONS')
assert(durableObjectBinding?.class_name === 'GroupSessionDO', 'GROUP_SESSIONS must bind to GroupSessionDO.')
assert(
  wrangler.migrations?.some(migration => migration.new_sqlite_classes?.includes('GroupSessionDO')) === true,
  'wrangler.jsonc must include a Durable Object migration for GroupSessionDO.',
)

const routePatterns = new Set(wrangler.routes?.map(route => route.pattern))
assert(routePatterns.has('pairresearch.io'), 'wrangler.jsonc must route pairresearch.io.')
assert(routePatterns.has('www.pairresearch.io'), 'wrangler.jsonc must route www.pairresearch.io.')

const deployWorkflow = readText('.github/workflows/deploy-production.yml')
for (const name of REQUIRED_RELEASE_ENV_VALUES) {
  assert(deployWorkflow.includes(`secrets.${name}`), `Production deploy workflow must reference secret: ${name}`)
}
for (const name of REQUIRED_DEPLOYMENT_SECRETS) {
  assert(deployWorkflow.includes(`secrets.${name}`), `Production deploy workflow must reference deployment secret: ${name}`)
}
for (const command of REQUIRED_PRODUCTION_DEPLOY_COMMANDS) {
  assert(deployWorkflow.includes(command), `Production deploy workflow must run: ${command}`)
}

const prChecksWorkflow = readText('.github/workflows/pr-checks.yml')
for (const command of REQUIRED_PR_CHECK_COMMANDS) {
  assert(prChecksWorkflow.includes(command), `PR checks must run: ${command}`)
}

const viteConfig = readText('vite.config.ts')
assert(
  viteConfig.includes('loadWranglerPublicVarsIntoEnv()'),
  'vite.config.ts must load wrangler.jsonc public vars before Vite resolves import.meta.env.',
)

const supabaseMigrationsDirectory = path.join(REPO_ROOT, 'supabase', 'migrations')
assert(fs.existsSync(supabaseMigrationsDirectory), 'No supabase/migrations directory found. Add migration artifacts before public release.')
assert(
  fs.existsSync(supabaseMigrationsDirectory) && fs.readdirSync(supabaseMigrationsDirectory).some(file => file.endsWith('.sql')),
  'No Supabase migration SQL files found. Add migration artifacts before public release.',
)

const seoConfig = readText('src/shared/seo/config.ts')
for (const route of REQUIRED_PUBLIC_ROUTES) {
  assert(seoConfig.includes(`path: '${route}'`), `SEO sitemap config must include public route: ${route}`)
}

const linkSourceFiles = [
  ...listFiles('src/features', ['.ts', '.tsx']),
  ...listFiles('src/routes', ['.ts', '.tsx']),
  ...listFiles('src/shared', ['.ts', '.tsx']),
]

for (const file of linkSourceFiles) {
  const source = readText(file)
  const staticLinks = [
    ...source.matchAll(/\b(?:href|to)=(?:"([^"]+)"|\{['"]([^'"]+)['"]\})/g),
    ...source.matchAll(/\b(?:href|to|actionHref):\s*['"]([^'"]+)['"]/g),
  ].map(match => match[1] ?? match[2]).filter((href): href is string => href !== undefined)

  for (const href of staticLinks) {
    const isExternal = href.startsWith('https://') || href.startsWith('http://') || href.startsWith('mailto:')
    if (href.startsWith('/')) {
      const routePath = href.split(/[?#]/)[0]
      assert(ROUTE_FILE_BY_PUBLIC_PATH[routePath] !== undefined, `${file} links to ${href}, but no route is registered for ${routePath}.`)
    }
    else {
      assert(isExternal, `${file} link must be an absolute external URL, mailto URL, or registered local route: ${href}`)
    }
  }
}

for (const [routePath, routeFile] of Object.entries(ROUTE_FILE_BY_PUBLIC_PATH)) {
  if (!routePath.includes('$')) {
    assert(fs.existsSync(path.join(REPO_ROOT, routeFile)), `Route file is missing for ${routePath}: ${routeFile}`)
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`Error: ${failure}`)
  }
  process.exit(1)
}

console.log('Release preflight passed.')
