import { describe, expect, it } from 'vitest'
import { createUserSafeActionError, getActionErrorMessage } from './actionErrors'

describe('group server action errors', () => {
  it('returns explicitly marked user-safe messages', () => {
    expect(getActionErrorMessage(
      createUserSafeActionError('Only group managers can update roles.'),
      'Failed to update the role.',
    )).toBe('Only group managers can update roles.')
  })

  it('masks ordinary Error messages', () => {
    expect(getActionErrorMessage(
      new Error('PrismaClientKnownRequestError: connection details'),
      'Failed to update the role.',
    )).toBe('Failed to update the role.')
  })

  it('masks empty user-safe messages', () => {
    expect(getActionErrorMessage(
      createUserSafeActionError('   '),
      'Failed to update the role.',
    )).toBe('Failed to update the role.')
  })
})
