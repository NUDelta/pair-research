import type { PrismaClient } from '../../../../../prisma/generated/client/client'
import { describe, expect, it, vi } from 'vitest'
import { acceptInvitationForUser } from './acceptGroupInvitation'

const authenticatedUserId = '00000000-0000-4000-8000-000000000001'
const groupId = '00000000-0000-4000-8000-000000000002'

function prismaWithInvitation(invitation: unknown, updatedCount = 1) {
  const updateMany = vi.fn().mockResolvedValue({ count: updatedCount })
  return {
    prisma: {
      group_member: {
        findFirst: vi.fn().mockResolvedValue(invitation),
        updateMany,
      },
    } as unknown as PrismaClient,
    updateMany,
  }
}

describe('acceptInvitationForUser', () => {
  it('binds acceptance to the authenticated UUID and pending group membership', async () => {
    const { prisma, updateMany } = prismaWithInvitation({
      id: 10n,
      group_id: groupId,
      is_pending: true,
      group: { name: 'Research Group' },
    })

    await expect(acceptInvitationForUser(prisma, authenticatedUserId, groupId))
      .resolves
      .toMatchObject({ success: true })
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        user_id: authenticatedUserId,
        group_id: groupId,
        is_pending: true,
      }),
    }))
  })

  it('does not accept an invitation belonging to another authenticated account', async () => {
    const { prisma, updateMany } = prismaWithInvitation(null)

    await expect(acceptInvitationForUser(prisma, authenticatedUserId, groupId))
      .resolves
      .toMatchObject({ success: false })
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('fails closed when a concurrent acceptance already consumed the invitation', async () => {
    const { prisma } = prismaWithInvitation({
      id: 10n,
      group_id: groupId,
      is_pending: true,
      group: { name: 'Research Group' },
    }, 0)

    await expect(acceptInvitationForUser(prisma, authenticatedUserId, groupId))
      .resolves
      .toMatchObject({ success: false })
  })
})
