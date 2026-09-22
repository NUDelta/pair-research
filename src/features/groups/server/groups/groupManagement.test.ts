import type { User } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  ensureAuthUserForInvite,
  ensureProfileForInvite,
  findUniqueAuthUserByEmail,
  findUniqueAuthUsersByEmail,
  withSerializableRetry,
} from './groupManagement'

function authUser(id: string, email: string): User {
  return { id, email } as User
}

function authClient(options: {
  users?: User[]
  pages?: User[][]
  listError?: { message: string } | null
  invitedUser?: User | null
  inviteError?: { message: string } | null
}) {
  return {
    auth: {
      admin: {
        inviteUserByEmail: vi.fn(async () => ({
          data: { user: options.invitedUser ?? null },
          error: options.inviteError ?? null,
        })),
        listUsers: vi.fn(async ({ page }: { page: number }) => ({
          data: { users: options.pages?.[page - 1] ?? options.users ?? [] },
          error: options.listError ?? null,
        })),
      },
    },
  }
}

describe('invitation Auth identity resolution', () => {
  it('retries Prisma serialization conflicts without retrying unrelated errors', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockResolvedValue('completed')

    await expect(withSerializableRetry(operation)).resolves.toBe('completed')
    expect(operation).toHaveBeenCalledTimes(3)

    const unrelatedFailure = vi.fn().mockRejectedValue(new Error('provider failure'))
    await expect(withSerializableRetry(unrelatedFailure)).rejects.toThrow('provider failure')
    expect(unrelatedFailure).toHaveBeenCalledOnce()
  })

  it('normalizes mixed-case email and returns the unique Auth UUID', async () => {
    const client = authClient({ users: [authUser('auth-user-1', 'Member@Example.com')] })

    const result = await ensureAuthUserForInvite(' MEMBER@example.COM ', client)

    expect(result.user).toEqual({ id: 'auth-user-1', email: 'member@example.com' })
    expect(result.invitedNewUser).toBe(false)
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled()
  })

  it('fails closed when normalized Auth email matches are ambiguous', async () => {
    const client = authClient({
      users: [
        authUser('auth-user-1', 'member@example.com'),
        authUser('auth-user-2', 'MEMBER@example.com'),
      ],
    })

    await expect(findUniqueAuthUserByEmail(client, 'member@example.com')).rejects.toThrow(
      'multiple Auth identities',
    )
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled()
  })

  it('resolves a requested batch with one paginated Auth scan', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => authUser(`filler-${index}`, `filler-${index}@example.com`))
    const client = authClient({
      pages: [firstPage, [authUser('auth-user-2', 'Later@Example.com')]],
    })

    const users = await findUniqueAuthUsersByEmail(client, ['later@example.com', 'missing@example.com'])

    expect(users.get('later@example.com')?.id).toBe('auth-user-2')
    expect(users.has('missing@example.com')).toBe(false)
    expect(client.auth.admin.listUsers).toHaveBeenCalledTimes(2)
  })

  it('fails the whole batch when duplicates appear across Auth pages', async () => {
    const firstPage = [
      authUser('auth-user-1', 'duplicate@example.com'),
      ...Array.from({ length: 999 }, (_, index) => authUser(`filler-${index}`, `filler-${index}@example.com`)),
    ]
    const client = authClient({
      pages: [firstPage, [authUser('auth-user-2', 'DUPLICATE@example.com')]],
    })

    await expect(findUniqueAuthUsersByEmail(client, ['duplicate@example.com'])).rejects.toThrow(
      'multiple Auth identities',
    )
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled()
  })

  it('provisions a not-yet-existing user through the invite API and checks returned errors', async () => {
    const invited = authUser('new-auth-user', 'new@example.com')
    const client = authClient({ users: [], invitedUser: invited })

    await expect(ensureAuthUserForInvite('new@example.com', client)).resolves.toMatchObject({
      user: { id: 'new-auth-user', email: 'new@example.com' },
      invitedNewUser: true,
      deliveryStatus: 'sent',
    })
    expect(client.auth.admin.inviteUserByEmail).toHaveBeenCalledWith('new@example.com')
  })

  it('does not treat an Auth Admin list error as a missing user', async () => {
    const client = authClient({ users: [], listError: { message: 'provider unavailable' } })

    await expect(ensureAuthUserForInvite('new@example.com', client)).rejects.toThrow(
      'Failed to resolve',
    )
    expect(client.auth.admin.inviteUserByEmail).not.toHaveBeenCalled()
  })

  it('upserts profile by trusted Auth UUID and ignores stale profile email identity', async () => {
    const client = authClient({ users: [authUser('auth-user-1', 'trusted@example.com')] })
    const upsert = vi.fn(async ({ create }: { create: { id: string, email: string } }) => create)
    const db = { profile: { upsert } }

    const result = await ensureProfileForInvite('TRUSTED@example.com', db, client)

    expect(result.profile).toEqual({ id: 'auth-user-1', email: 'trusted@example.com' })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'auth-user-1' },
      create: { id: 'auth-user-1', email: 'trusted@example.com' },
    }))
  })
})
