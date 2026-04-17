import { describe, expect, it } from 'vitest'
import { resolveBulkRoleActionPlan } from './groupRoleBulkActions'

const roles = [
  { id: '1', title: 'Researcher' },
  { id: '2', title: 'Analyst' },
  { id: '3', title: 'Writer' },
]

describe('resolveBulkRoleActionPlan', () => {
  it('requires at least one selected role', () => {
    expect(resolveBulkRoleActionPlan({
      action: 'merge',
      roles,
      selectedRoleIds: [],
      targetRoleId: '2',
    })).toEqual({
      success: false,
      message: 'Select at least one role to continue.',
    })
  })

  it('rejects missing selected roles', () => {
    expect(resolveBulkRoleActionPlan({
      action: 'merge',
      roles,
      selectedRoleIds: ['missing'],
      targetRoleId: '2',
    })).toEqual({
      success: false,
      message: 'One or more selected roles are no longer available.',
    })
  })

  it('allows merging multiple roles into a selected role', () => {
    expect(resolveBulkRoleActionPlan({
      action: 'merge',
      roles,
      selectedRoleIds: ['1', '2'],
      targetRoleId: '2',
    })).toEqual({
      success: true,
      createTargetRole: false,
      sourceRoleIds: ['1'],
      targetRoleId: '2',
      targetRoleTitle: 'Analyst',
    })
  })

  it('requires remove targets to stay outside the selected roles', () => {
    expect(resolveBulkRoleActionPlan({
      action: 'remove',
      roles,
      selectedRoleIds: ['1', '2'],
      targetRoleId: '2',
    })).toEqual({
      success: false,
      message: 'Choose a replacement role outside the selected roles.',
    })
  })

  it('reuses a selected role title when merging into a matching new title', () => {
    expect(resolveBulkRoleActionPlan({
      action: 'merge',
      roles,
      selectedRoleIds: ['1', '2'],
      targetRoleTitle: 'Analyst',
    })).toEqual({
      success: true,
      createTargetRole: false,
      sourceRoleIds: ['1'],
      targetRoleId: '2',
      targetRoleTitle: 'Analyst',
    })
  })

  it('rejects matching selected titles for remove flows', () => {
    expect(resolveBulkRoleActionPlan({
      action: 'remove',
      roles,
      selectedRoleIds: ['1', '2'],
      targetRoleTitle: 'Analyst',
    })).toEqual({
      success: false,
      message: 'Choose a replacement role outside the selected roles.',
    })
  })

  it('creates a new destination when the title is unique', () => {
    expect(resolveBulkRoleActionPlan({
      action: 'merge',
      roles,
      selectedRoleIds: ['1', '2'],
      targetRoleTitle: 'Editor',
    })).toEqual({
      success: true,
      createTargetRole: true,
      sourceRoleIds: ['1', '2'],
      targetRoleTitle: 'Editor',
    })
  })

  it('redirects duplicate unselected titles to the existing-role flow', () => {
    expect(resolveBulkRoleActionPlan({
      action: 'merge',
      roles,
      selectedRoleIds: ['1'],
      targetRoleTitle: 'Writer',
    })).toEqual({
      success: false,
      message: 'A role with that title already exists. Choose it as the destination instead.',
    })
  })
})
