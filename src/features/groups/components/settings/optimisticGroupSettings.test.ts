import type { GroupSettingsData } from './types'
import { describe, expect, it } from 'vitest'
import {
  applyBulkMemberRoleUpdate,
  applyBulkRoleAction,
  applyGroupBasicsUpdate,
  applyGroupMemberInvites,
  applyMemberRemoval,
  applyMemberUpdate,
  applyRoleCreate,
  applyRoleDelete,
  applyRoleUpdate,
  createGroupSettingsOptimisticUpdate,
} from './optimisticGroupSettings'

const baseSettings: GroupSettingsData = {
  group: {
    id: 'group-1',
    name: 'Research Lab',
    description: 'Weekly syncs',
    creatorId: 'user-1',
    activePairingId: null,
  },
  currentUserId: 'user-1',
  roles: [
    { id: 'role-1', title: 'Researcher' },
    { id: 'role-2', title: 'Writer' },
    { id: 'role-3', title: 'Editor' },
  ],
  members: [
    {
      userId: 'user-1',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
      email: 'ada@example.com',
      roleId: 'role-1',
      roleTitle: 'Researcher',
      isAdmin: true,
      isPending: false,
      joinedAt: '2026-04-17T12:00:00.000Z',
      isCreator: true,
    },
    {
      userId: 'user-2',
      fullName: 'Grace Hopper',
      avatarUrl: null,
      email: 'grace@example.com',
      roleId: 'role-2',
      roleTitle: 'Writer',
      isAdmin: false,
      isPending: false,
      joinedAt: '2026-04-18T12:00:00.000Z',
      isCreator: false,
    },
    {
      userId: 'invite-1',
      fullName: null,
      avatarUrl: null,
      email: 'invitee@example.com',
      roleId: 'role-2',
      roleTitle: 'Writer',
      isAdmin: false,
      isPending: true,
      joinedAt: '2026-04-19T12:00:00.000Z',
      isCreator: false,
    },
  ],
}

describe('optimisticGroupSettings', () => {
  it('updates group basics immediately and can roll back to the prior loader state', () => {
    const update = createGroupSettingsOptimisticUpdate(baseSettings, (draft) => {
      applyGroupBasicsUpdate(draft, {
        name: '  New Lab  ',
        description: '   ',
      })
    })

    expect(update.nextState.group).toEqual({
      ...baseSettings.group,
      name: 'New Lab',
      description: null,
    })
    expect(update.rollback(update.nextState)).toEqual(baseSettings)
  })

  it('renames a role and updates matching members', () => {
    const update = createGroupSettingsOptimisticUpdate(baseSettings, (draft) => {
      applyRoleUpdate(draft, {
        roleId: 'role-2',
        title: '  Story Lead  ',
      })
    })

    expect(update.nextState.roles[1]).toEqual({
      id: 'role-2',
      title: 'Story Lead',
    })
    expect(update.nextState.members[1]?.roleTitle).toBe('Story Lead')
    expect(update.nextState.members[2]?.roleTitle).toBe('Story Lead')
    expect(update.rollback(update.nextState)).toEqual(baseSettings)
  })

  it('creates, deletes, and bulk manages roles while keeping assignments in sync', () => {
    const created = createGroupSettingsOptimisticUpdate(baseSettings, (draft) => {
      applyRoleCreate(draft, {
        id: 'temp-role',
        title: 'Moderator',
        isOptimistic: true,
      })
    }).nextState

    expect(created.roles.at(-1)).toEqual({
      id: 'temp-role',
      title: 'Moderator',
      isOptimistic: true,
    })

    const deleted = createGroupSettingsOptimisticUpdate(baseSettings, (draft) => {
      applyRoleDelete(draft, {
        roleId: 'role-2',
        replacementRoleId: 'role-3',
      })
    }).nextState

    expect(deleted.roles.map(role => role.id)).toEqual(['role-1', 'role-3'])
    expect(deleted.members[1]?.roleId).toBe('role-3')
    expect(deleted.members[1]?.roleTitle).toBe('Editor')
    expect(deleted.members[2]?.roleId).toBe('role-3')

    const merged = createGroupSettingsOptimisticUpdate(baseSettings, (draft) => {
      const result = applyBulkRoleAction(draft, {
        action: 'merge',
        selectedRoleIds: ['role-1', 'role-2'],
        targetRoleTitle: 'Facilitator',
        tempRoleId: 'temp-destination',
      })

      expect(result).toMatchObject({
        success: true,
        createTargetRole: true,
        sourceRoleIds: ['role-1', 'role-2'],
        targetRoleTitle: 'Facilitator',
      })
    }).nextState

    expect(merged.roles).toEqual([
      {
        id: 'role-3',
        title: 'Editor',
      },
      {
        id: 'temp-destination',
        title: 'Facilitator',
        isOptimistic: true,
      },
    ])
    expect(merged.members.map(member => member.roleTitle)).toEqual([
      'Facilitator',
      'Facilitator',
      'Facilitator',
    ])
  })

  it('updates single-member, bulk-member, removal, and invite flows', () => {
    const updatedMember = createGroupSettingsOptimisticUpdate(baseSettings, (draft) => {
      applyMemberUpdate(draft, {
        userId: 'user-2',
        isAdmin: true,
        roleId: 'role-3',
      })
    }).nextState

    expect(updatedMember.members[1]).toMatchObject({
      isAdmin: true,
      roleId: 'role-3',
      roleTitle: 'Editor',
    })

    const bulkUpdated = createGroupSettingsOptimisticUpdate(baseSettings, (draft) => {
      applyBulkMemberRoleUpdate(draft, {
        userIds: ['user-1', 'invite-1'],
        roleId: 'role-3',
      })
    }).nextState

    expect(bulkUpdated.members[0]?.roleTitle).toBe('Editor')
    expect(bulkUpdated.members[2]?.roleTitle).toBe('Editor')

    const removed = createGroupSettingsOptimisticUpdate(baseSettings, (draft) => {
      applyMemberRemoval(draft, ['user-2'])
    }).nextState

    expect(removed.members.map(member => member.userId)).toEqual(['user-1', 'invite-1'])

    const invited = createGroupSettingsOptimisticUpdate(baseSettings, (draft) => {
      applyGroupMemberInvites(draft, {
        invites: [
          {
            email: 'new@example.com',
            roleId: 'role-1',
            isAdmin: false,
          },
        ],
        tempMembers: [
          {
            userId: 'temp-member-1',
            email: 'new@example.com',
            roleId: 'role-1',
            isAdmin: false,
            joinedAt: '2026-04-20T12:00:00.000Z',
          },
        ],
      })
    }).nextState

    expect(invited.members.at(-1)).toEqual({
      userId: 'temp-member-1',
      fullName: null,
      avatarUrl: null,
      email: 'new@example.com',
      roleId: 'role-1',
      roleTitle: 'Researcher',
      isAdmin: false,
      isPending: true,
      joinedAt: '2026-04-20T12:00:00.000Z',
      isCreator: false,
      isOptimistic: true,
    })
  })
})
