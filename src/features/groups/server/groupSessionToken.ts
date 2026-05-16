import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { checkMembership } from '@/features/groups/server/checkMembership'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { getRequiredServerEnv } from '@/shared/server/env.server'
import { getUser } from '@/shared/supabase/server'

const TOKEN_TTL_SECONDS = 5 * 60

const tokenInputSchema = z.object({
  groupId: z.string(),
})

interface GroupSessionTokenPayload {
  groupId: string
  userId: string
  exp: number
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))

  return bytesToBase64Url(new Uint8Array(signature))
}

async function timingSafeEqual(left: string, right: string): Promise<boolean> {
  const leftBytes = base64UrlToBytes(left)
  const rightBytes = base64UrlToBytes(right)

  if (leftBytes.length !== rightBytes.length) {
    return false
  }

  let diff = 0
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index]
  }

  return diff === 0
}

export async function createGroupSessionTokenValue(
  payload: GroupSessionTokenPayload,
  secret: string,
): Promise<string> {
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = await sign(encodedPayload, secret)

  return `${encodedPayload}.${signature}`
}

export async function verifyGroupSessionTokenValue(
  token: string,
  secret: string,
  expectedGroupId: string,
): Promise<GroupSessionTokenPayload | null> {
  const [encodedPayload, signature, extra] = token.split('.')
  if (encodedPayload === undefined || signature === undefined || extra !== undefined) {
    return null
  }

  const expectedSignature = await sign(encodedPayload, secret)
  try {
    if (!await timingSafeEqual(signature, expectedSignature)) {
      return null
    }

    const payloadText = new TextDecoder().decode(base64UrlToBytes(encodedPayload))
    const payload = JSON.parse(payloadText) as Partial<GroupSessionTokenPayload>

    if (
      typeof payload.groupId !== 'string'
      || typeof payload.userId !== 'string'
      || typeof payload.exp !== 'number'
      || payload.groupId !== expectedGroupId
      || payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return payload as GroupSessionTokenPayload
  }
  catch {
    return null
  }
}

export const createGroupSessionToken = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(tokenInputSchema, data))
  .handler(async ({ data }) => {
    const user = await getUser()
    const membership = await checkMembership(user.id, data.groupId)

    if (!membership) {
      return {
        success: false,
        message: 'You are not a member in this group',
      }
    }

    const secret = getRequiredServerEnv('SUPABASE_SECRET_KEY')
    const token = await createGroupSessionTokenValue({
      groupId: data.groupId,
      userId: user.id,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }, secret)

    return {
      success: true,
      token,
    }
  })
