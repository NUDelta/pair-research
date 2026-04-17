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
  it('marks invitations accepted immediately and can roll the list back', () => {
    const update = createGroupListOptimisticUpdate(groups, (draft) => {
      applyInvitationAcceptance(draft, 'group-1')
    })

    expect(update.nextState[0]?.isPending).toBe(false)
    expect(update.nextState[1]?.isPending).toBe(false)
    expect(update.rollback(update.nextState)).toEqual(groups)
  })
})
