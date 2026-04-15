import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MemberInviteBatchEditor from './MemberInviteBatchEditor'

const baseProps = {
  defaultIsAdmin: false,
  defaultRoleId: '1',
  draftSource: '',
  inviteRows: [],
  maxInvites: 20,
  onAddBlankRow: vi.fn(),
  onApplyAssignment: vi.fn(),
  onDraftSourceChange: vi.fn(),
  onImportSource: vi.fn(),
  onOpenFilePicker: vi.fn(),
  onRemoveRow: vi.fn(),
  onSelectAllRows: vi.fn(),
  onSelectRow: vi.fn(),
  onUpdateDefaultAccess: vi.fn(),
  onUpdateDefaultRole: vi.fn(),
  onUpdateRow: vi.fn(),
  roles: [
    { id: '1', title: 'Researcher' },
    { id: '2', title: 'Professor' },
  ],
  rowErrors: {},
  selectedCount: 0,
  selectedRowIds: new Set<string>(),
}

describe('memberInviteBatchEditor', () => {
  it('keeps the CSV upload action available while empty', () => {
    render(<MemberInviteBatchEditor {...baseProps} />)

    expect(screen.getByRole('button', { name: /upload csv/i })).toBeVisible()
    expect(screen.getByText(/no invites prepared yet/i)).toBeVisible()
    expect(screen.getByText(/import a list, upload a csv, or add a blank row to start/i)).toBeVisible()
  })

  it('renders prepared invites in a table and supports select-all actions', async () => {
    const user = userEvent.setup()
    const onRemoveRow = vi.fn()
    const onSelectAllRows = vi.fn()

    render(
      <MemberInviteBatchEditor
        {...baseProps}
        inviteRows={[
          { id: 'invite-1', email: 'member@example.com', roleId: '1', isAdmin: false },
        ]}
        onRemoveRow={onRemoveRow}
        onSelectAllRows={onSelectAllRows}
      />,
    )

    expect(screen.getByPlaceholderText(/filter invites/i)).toBeVisible()
    expect(screen.getByDisplayValue('member@example.com')).toBeVisible()

    await user.click(screen.getByRole('checkbox', { name: /select all invites/i }))
    expect(onSelectAllRows).toHaveBeenCalledWith(true)

    await user.click(screen.getByRole('button', { name: /remove invite 1/i }))
    expect(onRemoveRow).toHaveBeenCalledWith('invite-1')
  })
})
