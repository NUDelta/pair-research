import '@tanstack/react-start/server-only'
import { env as cloudflareEnv } from 'cloudflare:workers'
import { z } from 'zod'

const nonEmptyStringSchema = z.string().trim().min(1)

type ServerEnvKey
  = | 'CLOUDFLARE_TURNSTILE_SECRET_KEY'
    | 'DATABASE_URL'
    | 'SUPABASE_SECRET_KEY'

function readServerEnvValue(name: ServerEnvKey): string | undefined {
  const bindingValue = nonEmptyStringSchema.safeParse(cloudflareEnv[name])
  if (bindingValue.success) {
    return bindingValue.data
  }

  const processValue = nonEmptyStringSchema.safeParse(process.env[name] ?? '')
  if (processValue.success) {
    return processValue.data
  }

  return undefined
}

export function getOptionalServerEnv(name: ServerEnvKey): string | undefined {
  return readServerEnvValue(name)
}

export function getRequiredServerEnv(name: ServerEnvKey, errorMessage?: string): string {
  const value = readServerEnvValue(name)

  if (value !== undefined) {
    return value
  }

  throw new Error(errorMessage ?? `${name} is required`)
}
