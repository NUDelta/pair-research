import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GroupMembersTable from './GroupMembersTable'

const { mockUseNavigate, mockUseRouter, mockUseServerFn } = vi.hoisted(() => ({
  mockUseNavigate: vi.fn(() => vi.fn()),
  mockUseRouter: vi.fn(() => ({
    invalidate: vi.fn(),
  })),
  mockUseServerFn: vi.fn(() => vi.fn()),
}))

function MockDataTable() {
  return <div data-testid="members-data-table">Members table</div>
}

function MockGroupMembersToolbar() {
  return <div data-testid="group-members-toolbar">Toolbar</div>
}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: mockUseNavigate,
  useRouter: mockUseRouter,
}))

vi.mock('@tanstack/react-start', () => ({
  useServerFn: mockUseServerFn,
}))

vi.mock('@/features/groups/server/groups/bulkUpdateGroupMemberRoles', () => ({
  bulkUpdateGroupMemberRoles: {},
}))

vi.mock('@/features/groups/server/groups/removeGroupMember', () => ({
  removeGroupMember: {},
}))

vi.mock('@/features/groups/server/groups/updateGroupMember', () => ({
  updateGroupMember: {},
}))

vi.mock('@/shared/ui/data-table', () => ({
  DataTable: MockDataTable,
}))

vi.mock('./GroupMembersToolbar', () => ({
  default: MockGroupMembersToolbar,
}))

describe('groupMembersTable', () => {
  it('wraps large member lists in an internal scroll region', () => {
    render(
      <GroupMembersTable
        creatorId="user-1"
        currentUserId="user-1"
        groupId="group-1"
        hasActivePairing
        members={[
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
        ]}
        roles={[
          {
            id: 'role-1',
            title: 'Researcher',
          },
        ]}
      />,
    )

    const card = screen.getByText('Members').closest('[data-slot="card"]')
    const scrollRegion = screen.getByTestId('group-members-scroll-region')

    expect(card).toHaveClass('overflow-hidden')
    expect(scrollRegion).toHaveClass('max-h-[70vh]', 'overflow-y-auto', 'overscroll-contain')
    expect(screen.getByText('Active pairing in progress')).toBeInTheDocument()
    expect(screen.getByTestId('members-data-table')).toBeInTheDocument()
  })
})
