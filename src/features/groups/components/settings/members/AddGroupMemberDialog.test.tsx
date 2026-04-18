import type { PropsWithChildren } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AddGroupMemberDialog from './AddGroupMemberDialog'

const { mockUseGroupMemberInviteDialog } = vi.hoisted(() => ({
  mockUseGroupMemberInviteDialog: vi.fn(() => ({
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
  })),
}))

const applyOptimisticUpdate = vi.fn(() => vi.fn())

function MockMemberInviteBatchEditor() {
  return <div data-testid="member-invite-batch-editor">Batch editor</div>
}

function MockDialog({ children }: PropsWithChildren) {
  return <div>{children}</div>
}

function MockDialogContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={className}>{children}</div>
}

function MockDialogDescription({ children }: PropsWithChildren) {
  return <div>{children}</div>
}

function MockDialogFooter({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={className}>{children}</div>
}

function MockDialogHeader({ children }: PropsWithChildren) {
  return <div>{children}</div>
}

function MockDialogTitle({ children }: PropsWithChildren) {
  return <div>{children}</div>
}

function MockDialogTrigger({ children }: PropsWithChildren) {
  return <div>{children}</div>
}

vi.mock('./useGroupMemberInviteDialog', () => ({
  useGroupMemberInviteDialog: mockUseGroupMemberInviteDialog,
}))

vi.mock('./MemberInviteBatchEditor', () => ({
  default: MockMemberInviteBatchEditor,
}))

vi.mock('@/shared/ui/dialog', () => ({
  Dialog: MockDialog,
  DialogContent: MockDialogContent,
  DialogDescription: MockDialogDescription,
  DialogFooter: MockDialogFooter,
  DialogHeader: MockDialogHeader,
  DialogTitle: MockDialogTitle,
  DialogTrigger: MockDialogTrigger,
}))

describe('addGroupMemberDialog', () => {
  it('keeps the add-members dialog content inside a scrollable region', () => {
    render(
      <AddGroupMemberDialog
        applyOptimisticUpdate={applyOptimisticUpdate}
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
      applyOptimisticUpdate,
      existingMemberEmails: [],
      groupId: 'group-1',
      roles: [{ id: 'role-1', title: 'Researcher' }],
    })
  })
})
