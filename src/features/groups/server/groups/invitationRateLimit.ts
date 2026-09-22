import type { Prisma, PrismaClient } from '../../../../../prisma/generated/client/client'
import { createUserSafeActionError } from '@/features/groups/server/actionErrors'
import { withSerializableRetry } from './groupManagement'

const ACTOR_WINDOW_LIMIT = 20
const GROUP_DAILY_LIMIT = 50
const GROUP_CREATE_DAILY_LIMIT = 10
const RECIPIENT_DAILY_LIMIT = 3

interface RateLimitCountRow {
  count: bigint
}

interface RecipientRateLimitRow {
  recipient_hash: string
  count: bigint
}

type InvitationDb = PrismaClient | Prisma.TransactionClient

export async function hashInvitationRecipient(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase()
  return hashInvitationValue(normalizedEmail)
}

export async function hashInvitationRequest(canonicalRequest: string): Promise<string> {
  return hashInvitationValue(canonicalRequest)
}

async function hashInvitationValue(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function reserveInvitationOperation(
  prisma: PrismaClient,
  input: {
    actorId: string
    groupId?: string
    operationId: string
    requestDigest: string
    recipientEmails: string[]
    reserveGroupCreation?: boolean
  },
): Promise<Map<string, { authUserId: string | null, deliveryStatus: string, status: string }>> {
  const recipientEntries = await Promise.all(input.recipientEmails.map(async email => ({
    email: email.trim().toLowerCase(),
    hash: await hashInvitationRecipient(email),
  })))

  await withSerializableRetry(async () => prisma.$transaction(async (tx) => {
    await acquireInvitationLocks(tx, input.actorId, input.groupId, recipientEntries.map(entry => entry.hash))

    const existingEvents = await tx.invitation_security_event.findMany({
      where: { operation_id: input.operationId },
      select: {
        actor_id: true,
        event_kind: true,
        group_id: true,
        request_digest: true,
        recipient_hash: true,
      },
    })
    if (existingEvents.length > 0) {
      const expectedHashes = new Set(recipientEntries.map(entry => entry.hash))
      const existingHashes = new Set(existingEvents.flatMap(event => event.recipient_hash === null ? [] : [event.recipient_hash]))
      const operationMatches = existingEvents.every(event => (
        event.actor_id === input.actorId
        && (
          input.reserveGroupCreation === true
          || event.group_id === null
          || event.group_id === input.groupId
        )
        && event.request_digest === input.requestDigest
      ))
      && expectedHashes.size === existingHashes.size
      && [...expectedHashes].every(hash => existingHashes.has(hash))
      && existingEvents.some(event => event.event_kind === 'group_create') === (input.reserveGroupCreation === true)

      if (!operationMatches) {
        throw createUserSafeActionError('This operation ID is already in use. Refresh and try again.')
      }
      return
    }

    const [actorCountRow] = await tx.$queryRaw<RateLimitCountRow[]>`
      select count(*)::bigint as count
      from public.invitation_security_event
      where actor_id = ${input.actorId}::uuid
        and event_kind = 'invitation'
        and created_at >= now() - interval '15 minutes'
    `
    if (Number(actorCountRow?.count ?? 0) + recipientEntries.length > ACTOR_WINDOW_LIMIT) {
      throw createUserSafeActionError('Too many invitations were requested. Wait 15 minutes and try again.')
    }

    if (input.reserveGroupCreation === true) {
      const [groupCreateCountRow] = await tx.$queryRaw<RateLimitCountRow[]>`
        select count(*)::bigint as count
        from public.invitation_security_event
        where actor_id = ${input.actorId}::uuid
          and event_kind = 'group_create'
          and created_at >= now() - interval '24 hours'
      `
      if (Number(groupCreateCountRow?.count ?? 0) >= GROUP_CREATE_DAILY_LIMIT) {
        throw createUserSafeActionError('You have reached the daily group creation limit.')
      }
    }

    if (input.groupId !== undefined) {
      const [groupCountRow] = await tx.$queryRaw<RateLimitCountRow[]>`
        select count(*)::bigint as count
        from public.invitation_security_event
        where group_id = ${input.groupId}::uuid
          and event_kind = 'invitation'
          and created_at >= now() - interval '24 hours'
      `
      if (Number(groupCountRow?.count ?? 0) + recipientEntries.length > GROUP_DAILY_LIMIT) {
        throw createUserSafeActionError('This group has reached its daily invitation limit.')
      }
    }

    const hashes = recipientEntries.map(entry => entry.hash)
    const recipientCounts = hashes.length === 0
      ? []
      : await tx.$queryRaw<RecipientRateLimitRow[]>`
          select recipient_hash, count(*)::bigint as count
          from public.invitation_security_event
          where recipient_hash = any(${hashes}::text[])
            and event_kind = 'invitation'
            and created_at >= now() - interval '24 hours'
          group by recipient_hash
        `
    if (recipientCounts.some(row => Number(row.count) >= RECIPIENT_DAILY_LIMIT)) {
      throw createUserSafeActionError('One or more recipients have reached the daily invitation limit.')
    }

    if (input.reserveGroupCreation === true) {
      await tx.invitation_security_event.create({
        data: {
          operation_id: input.operationId,
          event_kind: 'group_create',
          actor_id: input.actorId,
          request_digest: input.requestDigest,
        },
      })
    }

    if (recipientEntries.length > 0) {
      await tx.invitation_security_event.createMany({
        data: recipientEntries.map(entry => ({
          operation_id: input.operationId,
          event_kind: 'invitation',
          actor_id: input.actorId,
          group_id: input.groupId,
          request_digest: input.requestDigest,
          recipient_hash: entry.hash,
        })),
      })
    }
  }, { isolationLevel: 'Serializable' }))

  const rows = await prisma.invitation_security_event.findMany({
    where: {
      operation_id: input.operationId,
      actor_id: input.actorId,
      event_kind: 'invitation',
    },
    select: {
      recipient_hash: true,
      auth_user_id: true,
      delivery_status: true,
      status: true,
    },
  })

  return new Map(rows.flatMap(row => row.recipient_hash === null
    ? []
    : [[row.recipient_hash, {
        authUserId: row.auth_user_id,
        deliveryStatus: row.delivery_status,
        status: row.status,
      }] as const]))
}

export async function markInvitationProvisioned(
  db: InvitationDb,
  input: {
    actorId: string
    operationId: string
    recipientHash: string
    requestDigest: string
    authUserId: string
    deliveryStatus: 'existing' | 'sent' | 'unknown'
  },
): Promise<void> {
  await db.invitation_security_event.updateMany({
    where: {
      operation_id: input.operationId,
      actor_id: input.actorId,
      request_digest: input.requestDigest,
      recipient_hash: input.recipientHash,
    },
    data: {
      auth_user_id: input.authUserId,
      delivery_status: input.deliveryStatus,
      status: 'auth_provisioned',
      failure_stage: null,
      updated_at: new Date(),
    },
  })
}

export async function markInvitationOperationComplete(
  db: InvitationDb,
  input: { actorId: string, operationId: string, requestDigest: string, groupId: string },
): Promise<void> {
  await db.invitation_security_event.updateMany({
    where: {
      operation_id: input.operationId,
      actor_id: input.actorId,
      request_digest: input.requestDigest,
    },
    data: {
      group_id: input.groupId,
      status: 'membership_created',
      failure_stage: null,
      updated_at: new Date(),
    },
  })
}

export async function markInvitationOperationFailed(
  prisma: PrismaClient,
  input: { actorId: string, operationId: string, requestDigest: string, failureStage: string },
): Promise<void> {
  await prisma.invitation_security_event.updateMany({
    where: {
      operation_id: input.operationId,
      actor_id: input.actorId,
      request_digest: input.requestDigest,
      status: { not: 'membership_created' },
    },
    data: {
      status: 'failed',
      failure_stage: input.failureStage,
      updated_at: new Date(),
    },
  })
}

export async function lockInvitationOperation(
  tx: Prisma.TransactionClient,
  operationId: string,
): Promise<void> {
  await tx.$executeRaw`set local lock_timeout = '5s'`
  await tx.$queryRaw`select pg_advisory_xact_lock(hashtextextended(${`invite:operation:${operationId}`}, 0))::text`
}

export async function findCompletedInvitationOperation(
  db: InvitationDb,
  input: { actorId: string, operationId: string, requestDigest: string },
): Promise<{ groupId: string } | null> {
  const completed = await db.invitation_security_event.findFirst({
    where: {
      operation_id: input.operationId,
      actor_id: input.actorId,
      request_digest: input.requestDigest,
      event_kind: 'group_create',
      status: 'membership_created',
    },
    select: { group_id: true },
  })

  return completed?.group_id === null || completed?.group_id === undefined
    ? null
    : { groupId: completed.group_id }
}

export async function isInvitationOperationComplete(
  db: InvitationDb,
  input: { actorId: string, operationId: string, requestDigest: string },
): Promise<boolean> {
  return await db.invitation_security_event.findFirst({
    where: {
      operation_id: input.operationId,
      actor_id: input.actorId,
      request_digest: input.requestDigest,
      status: 'membership_created',
    },
    select: { id: true },
  }) !== null
}

export async function runLockedInvitationOperation(
  prisma: PrismaClient,
  input: { actorId: string, operationId: string, requestDigest: string },
  write: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<{ alreadyCompleted: boolean }> {
  return prisma.$transaction(async (tx) => {
    await lockInvitationOperation(tx, input.operationId)
    if (await isInvitationOperationComplete(tx, input)) {
      return { alreadyCompleted: true }
    }

    await write(tx)
    return { alreadyCompleted: false }
  })
}

async function acquireInvitationLocks(
  tx: Prisma.TransactionClient,
  actorId: string,
  groupId: string | undefined,
  recipientHashes: string[],
): Promise<void> {
  const lockKeys = [
    `invite:actor:${actorId}`,
    ...(groupId === undefined ? [] : [`invite:group:${groupId}`]),
    ...recipientHashes.map(hash => `invite:recipient:${hash}`),
  ].sort()

  await tx.$executeRaw`set local lock_timeout = '5s'`
  for (const lockKey of lockKeys) {
    await tx.$queryRaw`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text`
  }
}
