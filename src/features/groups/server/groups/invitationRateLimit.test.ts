import type { PrismaClient } from '../../../../../prisma/generated/client/client'
import { describe, expect, it, vi } from 'vitest'
import { hashInvitationRecipient, reserveInvitationOperation, runLockedInvitationOperation } from './invitationRateLimit'

const actorId = '00000000-0000-4000-8000-000000000001'
const groupId = '00000000-0000-4000-8000-000000000002'
const operationId = '00000000-0000-4000-8000-000000000003'
const requestDigest = 'a'.repeat(64)

function createPrisma(options: {
  actorCount?: bigint
  existingCount?: number
  groupCount?: bigint
  groupCreateCount?: bigint
  recipientCount?: bigint
} = {}) {
  const createMany = vi.fn().mockResolvedValue({ count: 1 })
  const queryRaw = vi.fn(async (strings: TemplateStringsArray) => {
    const sql = strings.join('?')
    if (sql.includes('actor_id') && sql.includes('event_kind = \'invitation\'')) {
      return [{ count: options.actorCount ?? 0n }]
    }
    if (sql.includes('event_kind = \'group_create\'')) {
      return [{ count: options.groupCreateCount ?? 0n }]
    }
    if (sql.includes('group by recipient_hash')) {
      return options.recipientCount === undefined
        ? []
        : [{ recipient_hash: requestDigest, count: options.recipientCount }]
    }
    if (sql.includes('group_id')) {
      return [{ count: options.groupCount ?? 0n }]
    }
    return [{ pg_advisory_xact_lock: '' }]
  })
  const eventModel = {
    create: vi.fn().mockResolvedValue({}),
    createMany,
    findMany: vi.fn()
      .mockResolvedValueOnce(options.existingCount === 1
        ? [{ actor_id: actorId, event_kind: 'group_create', group_id: groupId, request_digest: requestDigest, recipient_hash: null }]
        : [])
      .mockResolvedValue([]),
  }
  const transactionClient = {
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: queryRaw,
    invitation_security_event: eventModel,
  }
  const prisma = {
    $transaction: vi.fn(async (operation: (tx: unknown) => Promise<void>) => operation(transactionClient)),
    invitation_security_event: eventModel,
  } as unknown as PrismaClient

  return { createMany, eventModel, prisma }
}

describe('invitation operation security ledger', () => {
  it('normalizes recipient identity before hashing', async () => {
    await expect(hashInvitationRecipient('  User@Example.COM '))
      .resolves
      .toBe(await hashInvitationRecipient('user@example.com'))
  })

  it('reserves one durable event per recipient after limits pass', async () => {
    const { createMany, prisma } = createPrisma()

    await reserveInvitationOperation(prisma, {
      actorId,
      groupId,
      operationId,
      requestDigest,
      recipientEmails: ['one@example.com'],
    })

    expect(createMany).toHaveBeenCalledOnce()
  })

  it('does not consume quota twice for the same operation', async () => {
    const { createMany, prisma } = createPrisma({ existingCount: 1 })

    await reserveInvitationOperation(prisma, {
      actorId,
      operationId,
      requestDigest,
      recipientEmails: [],
      reserveGroupCreation: true,
    })

    expect(createMany).not.toHaveBeenCalled()
  })

  it('blocks the actor window before provisioning', async () => {
    const { createMany, prisma } = createPrisma({ actorCount: 20n })

    await expect(reserveInvitationOperation(prisma, {
      actorId,
      operationId,
      requestDigest,
      recipientEmails: ['one@example.com'],
    })).rejects.toThrow('Wait 15 minutes')
    expect(createMany).not.toHaveBeenCalled()
  })

  it('blocks the group daily invitation limit', async () => {
    const { prisma } = createPrisma({ groupCount: 50n })

    await expect(reserveInvitationOperation(prisma, {
      actorId,
      groupId,
      operationId,
      requestDigest,
      recipientEmails: ['one@example.com'],
    })).rejects.toThrow('daily invitation limit')
  })

  it('blocks the recipient daily invitation limit', async () => {
    const { prisma } = createPrisma({ recipientCount: 3n })

    await expect(reserveInvitationOperation(prisma, {
      actorId,
      groupId,
      operationId,
      requestDigest,
      recipientEmails: ['one@example.com'],
    })).rejects.toThrow('recipients have reached')
  })

  it('blocks the group creation daily limit', async () => {
    const { prisma } = createPrisma({ groupCreateCount: 10n })

    await expect(reserveInvitationOperation(prisma, {
      actorId,
      operationId,
      requestDigest,
      recipientEmails: [],
      reserveGroupCreation: true,
    })).rejects.toThrow('daily group creation limit')
  })

  it('rejects reuse of an operation ID with a different request payload', async () => {
    const { prisma } = createPrisma({ existingCount: 1 })

    await expect(reserveInvitationOperation(prisma, {
      actorId,
      operationId,
      requestDigest: 'b'.repeat(64),
      recipientEmails: [],
      reserveGroupCreation: true,
    })).rejects.toThrow('operation ID is already in use')
  })

  it('runs a concurrent same-operation write exactly once', async () => {
    let completed = false
    let writeCount = 0
    let transactionTail = Promise.resolve()
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([]),
      invitation_security_event: {
        findFirst: vi.fn(async () => completed ? { id: 1n } : null),
      },
    }
    const prisma = {
      $transaction: vi.fn(async (operation: (transaction: typeof tx) => Promise<unknown>) => {
        const previous = transactionTail
        let release = () => {}
        transactionTail = new Promise<void>((resolve) => {
          release = resolve
        })
        await previous
        try {
          return await operation(tx)
        }
        finally {
          release()
        }
      }),
    } as unknown as PrismaClient
    const write = vi.fn(async () => {
      writeCount += 1
      completed = true
    })

    const results = await Promise.all([
      runLockedInvitationOperation(prisma, { actorId, operationId, requestDigest }, write),
      runLockedInvitationOperation(prisma, { actorId, operationId, requestDigest }, write),
    ])

    expect(writeCount).toBe(1)
    expect(results).toEqual(expect.arrayContaining([
      { alreadyCompleted: false },
      { alreadyCompleted: true },
    ]))
  })
})
