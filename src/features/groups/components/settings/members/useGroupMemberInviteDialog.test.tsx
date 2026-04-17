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
})
