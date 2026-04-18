import type { Group } from '@/features/groups/schemas/group'
import { describe, expect, it } from 'vitest'
import { applyInvitationAcceptance, createGroupListOptimisticUpdate } from './optimisticGroups'

const groups: Group[] = [
  {
    id: 'group-1',
    groupName: 'Pending Group',
    groupDescription: 'Needs acceptance',
    role: 'Member',
    isAdmin: false,
    isPending: true,
    joinedAt: '2026-04-17T12:00:00.000Z',
  },
  {
    id: 'group-2',
    groupName: 'Joined Group',
    groupDescription: null,
    role: 'Admin',
    isAdmin: true,
    isPending: false,
    joinedAt: '2026-04-18T12:00:00.000Z',
  },
]

describe('optimisticGroups', () => {
  it('marks invitations accepted immediately with an optimistic joined timestamp and can roll the list back', () => {
    const update = createGroupListOptimisticUpdate(groups, (draft) => {
      applyInvitationAcceptance(draft, 'group-1', '2026-04-19T09:30:00.000Z')
    })

    expect(update.nextState[0]).toMatchObject({
      isPending: false,
      joinedAt: '2026-04-19T09:30:00.000Z',
    })
    expect(update.nextState[1]?.isPending).toBe(false)
    expect(update.rollback(update.nextState)).toEqual(groups)
  })
})
