import type { GroupSettingsData } from '../types'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGroupMemberInviteDialog } from './useGroupMemberInviteDialog'

const { invalidate, mockUseRouter, mockUseServerFn, toast } = vi.hoisted(() => ({
  invalidate: vi.fn(),
  mockUseRouter: vi.fn(() => ({ invalidate })),
  mockUseServerFn: vi.fn(() => vi.fn()),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

const applyOptimisticUpdate = vi.fn(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  useRouter: mockUseRouter,
}))

vi.mock('@tanstack/react-start', () => ({
  useServerFn: mockUseServerFn,
}))

vi.mock('sonner', () => ({
  toast,
}))

vi.mock('@/features/groups/server/groups/addGroupMembers', () => ({
  addGroupMembers: {},
}))

describe('useGroupMemberInviteDialog', () => {
  beforeEach(() => {
    applyOptimisticUpdate.mockReset()
    applyOptimisticUpdate.mockReturnValue(vi.fn())
    invalidate.mockReset()
    mockUseRouter.mockClear()
    mockUseServerFn.mockClear()
    toast.error.mockReset()
    toast.success.mockReset()
    toast.warning.mockReset()
  })

  it('ignores emails that already belong to group members and warns with details', async () => {
    const { result } = renderHook(() =>
      useGroupMemberInviteDialog({
        applyOptimisticUpdate,
        existingMemberEmails: ['ada@example.com'],
        groupId: 'group-1',
        roles: [{ id: '1', title: 'Researcher' }],
      }),
    )

    act(() => {
      result.current.handleImportSource([
        'email,role,access',
        'ada@example.com,Researcher,admin',
        'grace@example.com,Researcher,member',
      ].join('\n'))
    })

    await waitFor(() => {
      expect(result.current.inviteRows).toEqual([
        {
          id: 'invite-1',
          email: 'grace@example.com',
          roleId: '1',
          isAdmin: false,
        },
      ])
    })
    expect(toast.warning).toHaveBeenCalledWith(
      '1 user is already in this group and was ignored.',
      expect.objectContaining({
        description: 'ada@example.com',
      }),
    )
    expect(toast.success).toHaveBeenCalledWith(
      'Imported 1 member. Skipped 1 member already in the group.',
    )
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('still appends new invites when a mixed import also contains existing group members', async () => {
    const { result } = renderHook(() =>
      useGroupMemberInviteDialog({
        applyOptimisticUpdate,
        existingMemberEmails: ['ada@example.com'],
        groupId: 'group-1',
        roles: [{ id: '1', title: 'Researcher' }],
      }),
    )

    act(() => {
      result.current.handleImportSource('grace@example.com')
    })

    act(() => {
      result.current.handleImportSource([
        'email,role,access',
        'ada@example.com,Researcher,admin',
        'barbara@example.com,Researcher,member',
      ].join('\n'))
    })

    await waitFor(() => {
      expect(result.current.inviteRows).toEqual([
        {
          id: 'invite-1',
          email: 'grace@example.com',
          roleId: '1',
          isAdmin: false,
        },
        {
          id: 'invite-2',
          email: 'barbara@example.com',
          roleId: '1',
          isAdmin: false,
        },
      ])
    })
    expect(toast.warning).toHaveBeenLastCalledWith(
      '1 user is already in this group and was ignored.',
      expect.objectContaining({
        description: 'ada@example.com',
      }),
    )
    expect(toast.success).toHaveBeenLastCalledWith(
      'Imported 1 member. Skipped 1 member already in the group.',
    )
  })

  it('uses unique optimistic member ids across repeated submissions', async () => {
    const addGroupMembersFn = vi.fn().mockResolvedValue({
      success: true,
      message: 'Added 1 member.',
    })
    mockUseServerFn.mockReturnValue(addGroupMembersFn)

    const { result } = renderHook(() =>
      useGroupMemberInviteDialog({
        applyOptimisticUpdate,
        groupId: 'group-1',
        roles: [{ id: '1', title: 'Researcher' }],
      }),
    )

    act(() => {
      result.current.handleImportSource('grace@example.com')
    })

    act(() => {
      result.current.handleSubmit()
    })

    act(() => {
      result.current.handleImportSource('barbara@example.com')
    })

    act(() => {
      result.current.handleSubmit()
    })

    expect(applyOptimisticUpdate).toHaveBeenCalledTimes(2)

    const firstDraft: GroupSettingsData = {
      group: {
        id: 'group-1',
        name: 'Example group',
        description: null,
        creatorId: 'user-1',
        activePairingId: null,
      },
      currentUserId: 'user-1',
      roles: [{ id: '1', title: 'Researcher' }],
      members: [],
    }
    const secondDraft: GroupSettingsData = {
      group: {
        id: 'group-1',
        name: 'Example group',
        description: null,
        creatorId: 'user-1',
        activePairingId: null,
      },
      currentUserId: 'user-1',
      roles: [{ id: '1', title: 'Researcher' }],
      members: [],
    }

    const optimisticUpdateCalls = applyOptimisticUpdate.mock.calls as unknown as Array<[
      recipe: (draft: GroupSettingsData) => void,
    ]>
    const firstRecipe = optimisticUpdateCalls[0][0]
    const secondRecipe = optimisticUpdateCalls[1][0]

    firstRecipe(firstDraft)
    secondRecipe(secondDraft)

    expect(firstDraft.members[0]?.userId).toBe('optimistic-member-1')
    expect(secondDraft.members[0]?.userId).toBe('optimistic-member-2')
    expect(secondDraft.members[0]?.userId).not.toBe(firstDraft.members[0]?.userId)

    await waitFor(() => {
      expect(addGroupMembersFn).toHaveBeenCalledTimes(2)
    })
  })
})
