import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGroupMemberInviteDialog } from './useGroupMemberInviteDialog'

const invalidate = vi.fn()
const mockUseRouter = vi.fn(() => ({ invalidate }))
const mockUseServerFn = vi.fn(() => vi.fn())
const toast = {
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}

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

  it('ignores emails that already belong to group members and warns with details', () => {
    const { result } = renderHook(() =>
      useGroupMemberInviteDialog({
        existingMemberEmails: ['ada@example.com'],
        groupId: 'group-1',
        roles: [{ id: 'role-1', title: 'Researcher' }],
      }),
    )

    act(() => {
      result.current.handleImportSource([
        'email,role,access',
        'ada@example.com,Researcher,admin',
        'grace@example.com,Researcher,member',
      ].join('\n'))
    })

    expect(result.current.inviteRows).toEqual([
      {
        id: 'invite-1',
        email: 'grace@example.com',
        roleId: 'role-1',
        isAdmin: false,
      },
    ])
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
})
