import { describe, expect, it } from 'vitest'
import { getNextOptimisticRoleId } from './optimisticRoleIds'

describe('getNextOptimisticRoleId', () => {
  it('allocates unique, monotonic ids from the provided counter ref', () => {
    const counterRef = { current: 0 }

    expect(getNextOptimisticRoleId(counterRef, 'optimistic-bulk-role')).toBe('optimistic-bulk-role-1')
    expect(getNextOptimisticRoleId(counterRef, 'optimistic-bulk-role')).toBe('optimistic-bulk-role-2')
    expect(getNextOptimisticRoleId(counterRef, 'optimistic-bulk-role')).toBe('optimistic-bulk-role-3')
  })
})
