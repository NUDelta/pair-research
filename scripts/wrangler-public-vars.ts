import fs from 'node:fs'
import path from 'node:path'

export const REQUIRED_WRANGLER_PUBLIC_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SITE_BASE_URL',
  'R2_PUBLIC_DOMAIN',
  'VITE_CLOUDFLARE_TURNSTILE_SITE_KEY',
  'VITE_GOOGLE_CLIENT_ID',
] as const

export type WranglerPublicVarName = typeof REQUIRED_WRANGLER_PUBLIC_VARS[number]

interface WranglerPublicVarsConfig {
  vars?: Record<string, unknown>
}

export function stripJsonComments(source: string) {
  let result = ''
  let inString = false
  let quote = ''
  let escaped = false

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index]
    const next = source[index + 1]

    if (inString) {
      result += current
      if (escaped) {
        escaped = false
      }
      else if (current === '\\') {
        escaped = true
      }
      else if (current === quote) {
        inString = false
        quote = ''
      }
      continue
    }

    if (current === '"' || current === '\'') {
      inString = true
      quote = current
      result += current
      continue
    }

    if (current === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') {
        index += 1
      }
      result += '\n'
      continue
    }

    if (current === '/' && next === '*') {
      index += 2
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1
      }
      index += 1
      continue
    }

    result += current
  }

  return result
}

export function readWranglerPublicVarsConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, 'wrangler.jsonc')
  return JSON.parse(stripJsonComments(fs.readFileSync(configPath, 'utf8'))) as WranglerPublicVarsConfig
}

export function getWranglerPublicVars(cwd = process.cwd()) {
  const wrangler = readWranglerPublicVarsConfig(cwd)
  const values: Partial<Record<WranglerPublicVarName, string>> = {}

  for (const name of REQUIRED_WRANGLER_PUBLIC_VARS) {
    const value = wrangler.vars?.[name]
    if (typeof value === 'string' && value.trim() !== '') {
      values[name] = value.trim()
    }
  }

  return values
}

export function loadWranglerPublicVarsIntoEnv(cwd = process.cwd()) {
  const values = getWranglerPublicVars(cwd)

  for (const [name, value] of Object.entries(values)) {
    if (typeof process.env[name] !== 'string' || process.env[name].trim() === '') {
      process.env[name] = value
    }
  }

  return values
}
