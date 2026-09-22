import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
// @ts-expect-error Node's type stripping requires the explicit TypeScript extension.
import { findRootDevVarFiles, verifyBuildArtifacts } from './verify-build-artifacts.ts'

const BUILD_FORBIDDEN_ENV_NAMES = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_TURNSTILE_SECRET_KEY',
  'CONTACT_ADMIN_EMAIL',
  'CONTACT_FROM_EMAIL',
  'DATABASE_URL',
  'GROUP_SESSION_SIGNING_SECRET',
  'RESEND_API_KEY',
  'SUPABASE_SECRET_KEY',
] as const

export function createBuildEnvironment(source: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const environment = { ...source }
  for (const name of BUILD_FORBIDDEN_ENV_NAMES) {
    delete environment[name]
  }

  environment.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = 'false'
  environment.WRANGLER_LOG_PATH = '.wrangler/logs'
  // Worker bindings augment ProcessEnv as required, but a build subprocess is
  // intentionally denied those runtime-only values.
  return environment as NodeJS.ProcessEnv
}

function main() {
  const rootDevVars = findRootDevVarFiles()
  if (rootDevVars.length > 0) {
    console.error(`Production build refused: remove local ${rootDevVars.join(', ')} before building.`)
    process.exit(1)
  }

  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const build = spawnSync(command, ['exec', 'vite', 'build'], {
    env: createBuildEnvironment(process.env),
    stdio: 'inherit',
  })

  // Scan even when Vite fails so a partially written secret-bearing artifact is
  // removed before this process returns control to CI or a developer shell.
  const scan = verifyBuildArtifacts({
    cleanup: true,
    requireDeployEntry: build.status === 0,
  })
  if (scan.failures.length > 0) {
    console.error('Build artifact security verification failed:')
    for (const failure of scan.failures) {
      console.error(`- ${failure}`)
    }
  }
  else {
    console.log(`Build artifact security verification passed (${scan.fileCount} files scanned).`)
  }

  if (build.error !== undefined) {
    console.error(`Unable to start Vite build: ${build.error.message}`)
  }

  if (build.status !== 0 || scan.failures.length > 0) {
    process.exit(1)
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main()
}
