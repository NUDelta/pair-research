import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const BUILD_ROOTS = ['dist', '.output']
const REQUIRED_DEPLOY_ENTRY = path.join('dist', 'server', 'wrangler.json')
const FORBIDDEN_BASENAMES = [
  /^\.dev\.vars(?:\..+)?$/,
  /^\.env(?:\..+)?$/,
  /^\.(?:netrc|npmrc|yarnrc(?:\..+)?)$/i,
  /\.(?:key|pem|p12|p8|pfx|pkcs8|jks)$/i,
  /^id_(?:rsa|ed25519)$/i,
  /^(?:credentials|service-account)(?:\..+)?$/i,
  /^secrets?\.(?:json|ya?ml)$/i,
]

function listFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return []
  }

  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name)
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath]
  })
}

export function findRootDevVarFiles(root = process.cwd()): string[] {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^\.dev\.vars(?:\..+)?$/.test(entry.name))
    .map(entry => entry.name)
}

export function verifyBuildArtifacts(options: {
  cleanup?: boolean
  requireDeployEntry?: boolean
  root?: string
} = {}): { failures: string[], fileCount: number } {
  const root = options.root ?? process.cwd()
  const files = BUILD_ROOTS.flatMap(buildRoot => listFiles(path.join(root, buildRoot)))
  const failures = new Set<string>()
  const canaries = (process.env.BUILD_SECRET_SCAN_CANARIES ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(value => value.length >= 8)
    .map(value => Buffer.from(value))

  if (options.requireDeployEntry !== false && !fs.existsSync(path.join(root, REQUIRED_DEPLOY_ENTRY))) {
    failures.add(`${REQUIRED_DEPLOY_ENTRY}: required deploy entry is missing`)
  }

  for (const file of files) {
    const relativeFile = path.relative(root, file)
    const basename = path.basename(file)
    const forbiddenName = FORBIDDEN_BASENAMES.some(pattern => pattern.test(basename))
    const contents = fs.readFileSync(file)
    const containsCanary = canaries.some(canary => contents.includes(canary))

    if (forbiddenName) {
      failures.add(`${relativeFile}: forbidden secret-file pattern`)
    }
    if (containsCanary) {
      failures.add(`${relativeFile}: secret canary found`)
    }

    if (options.cleanup === true && (forbiddenName || containsCanary)) {
      fs.rmSync(file, { force: true })
    }
  }

  return { failures: [...failures], fileCount: files.length }
}

function main() {
  const { failures, fileCount } = verifyBuildArtifacts({ cleanup: true })

  if (failures.length > 0) {
    console.error('Build artifact security verification failed:')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log(`Build artifact security verification passed (${fileCount} files scanned).`)
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main()
}
