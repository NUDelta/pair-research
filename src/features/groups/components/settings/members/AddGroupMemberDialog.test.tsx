import type { PropsWithChildren } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AddGroupMemberDialog from './AddGroupMemberDialog'

const mockUseGroupMemberInviteDialog = vi.fn(() => ({
  defaultIsAdmin: false,
  defaultRoleId: 'role-1',
  draftSource: '',
  fileInputRef: { current: null },
  handleAddBlankRow: vi.fn(),
  handleApplyAssignment: vi.fn(),
  handleCancel: vi.fn(),
  handleDialogToggle: vi.fn(),
  handleFileChange: vi.fn(),
  handleImportSource: vi.fn(),
  handleRemoveRow: vi.fn(),
  handleSubmit: vi.fn(),
  handleUpdateRow: vi.fn(),
  hasAdminInvite: false,
  inviteRows: [],
  isPending: false,
  open: true,
  rowErrors: {},
  selectedRowIdSet: new Set<string>(),
  selectedRowIds: [],
  setDefaultIsAdmin: vi.fn(),
  setDefaultRoleId: vi.fn(),
  setDraftSource: vi.fn(),
  setSelectedRowIds: vi.fn(),
  toggleRowSelection: vi.fn(),
}))

vi.mock('./useGroupMemberInviteDialog', () => ({
  useGroupMemberInviteDialog: mockUseGroupMemberInviteDialog,
}))

vi.mock('./MemberInviteBatchEditor', () => ({
  default: () => <div data-testid="member-invite-batch-editor">Batch editor</div>,
}))

vi.mock('@/shared/ui/dialog', () => ({
  Dialog: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DialogContent: ({ children, className }: PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  DialogDescription: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DialogFooter: ({ children, className }: PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DialogTrigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

describe('AddGroupMemberDialog', () => {
  it('keeps the add-members dialog content inside a scrollable region', () => {
    render(
      <AddGroupMemberDialog
        groupId="group-1"
        roles={[{ id: 'role-1', title: 'Researcher' }]}
      />,
    )

    const scrollRegion = screen.getByTestId('add-members-dialog-scroll-region')
    const dialogContent = scrollRegion.parentElement?.parentElement

    expect(dialogContent).toHaveClass('max-h-[90vh]', 'overflow-hidden')
    expect(scrollRegion).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto', 'overscroll-contain')
    expect(screen.getByTestId('member-invite-batch-editor')).toBeInTheDocument()
    expect(mockUseGroupMemberInviteDialog).toHaveBeenCalledWith({
      groupId: 'group-1',
      roles: [{ id: 'role-1', title: 'Researcher' }],
    })
  })
})
