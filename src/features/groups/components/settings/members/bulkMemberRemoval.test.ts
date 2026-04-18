import { describe, expect, it, vi } from 'vitest'
import { performBulkMemberRemoval } from './bulkMemberRemoval'

const members = [
  { userId: 'user-1', displayName: 'Ada Lovelace' },
  { userId: 'user-2', displayName: 'Grace Hopper' },
] as const

describe('performBulkMemberRemoval', () => {
  it('keeps the optimistic removal when every member removal succeeds', async () => {
    const rollbacks: Array<ReturnType<typeof vi.fn>> = []
    const applyOptimisticRemoval = vi.fn((_userIds: string[]) => {
      const rollback = vi.fn()
      rollbacks.push(rollback)
      return rollback
    })
    const onError = vi.fn()
    const onInvalidate = vi.fn()
    const onSelectionReset = vi.fn()
    const onSuccess = vi.fn()
    const removeMember = vi.fn().mockResolvedValue({ success: true, message: 'Removed.' })

    await performBulkMemberRemoval({
      applyOptimisticRemoval,
      members: [...members],
      onError,
      onInvalidate,
      onSelectionReset,
      onSuccess,
      removeMember,
    })

    expect(applyOptimisticRemoval).toHaveBeenCalledTimes(1)
    expect(applyOptimisticRemoval).toHaveBeenCalledWith(['user-1', 'user-2'])
    expect(rollbacks[0]).not.toHaveBeenCalled()
    expect(onSelectionReset).toHaveBeenCalledTimes(1)
    expect(onInvalidate).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('Removed 2 selected members.')
    expect(onError).not.toHaveBeenCalled()
  })

  it('rolls back the optimistic removal when every member removal fails', async () => {
    const rollbacks: Array<ReturnType<typeof vi.fn>> = []
    const applyOptimisticRemoval = vi.fn((_userIds: string[]) => {
      const rollback = vi.fn()
      rollbacks.push(rollback)
      return rollback
    })
    const onError = vi.fn()
    const onInvalidate = vi.fn()
    const onSelectionReset = vi.fn()
    const onSuccess = vi.fn()
    const removeMember = vi.fn().mockResolvedValue({ success: false, message: 'Permission denied.' })

    await performBulkMemberRemoval({
      applyOptimisticRemoval,
      members: [members[0]],
      onError,
      onInvalidate,
      onSelectionReset,
      onSuccess,
      removeMember,
    })

    expect(applyOptimisticRemoval).toHaveBeenCalledTimes(1)
    expect(rollbacks[0]).toHaveBeenCalledTimes(1)
    expect(onInvalidate).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('Ada Lovelace: Permission denied.')
  })

  it('rolls back and reapplies only the successful removals when failures are mixed', async () => {
    const rollbacks: Array<ReturnType<typeof vi.fn>> = []
    const applyOptimisticRemoval = vi.fn((_userIds: string[]) => {
      const rollback = vi.fn()
      rollbacks.push(rollback)
      return rollback
    })
    const onError = vi.fn()
    const onInvalidate = vi.fn()
    const onSelectionReset = vi.fn()
    const onSuccess = vi.fn()
    const removeMember = vi.fn()
      .mockResolvedValueOnce({ success: true, message: 'Removed.' })
      .mockResolvedValueOnce({ success: false, message: 'Permission denied.' })

    await performBulkMemberRemoval({
      applyOptimisticRemoval,
      members: [...members],
      onError,
      onInvalidate,
      onSelectionReset,
      onSuccess,
      removeMember,
    })

    expect(applyOptimisticRemoval).toHaveBeenCalledTimes(2)
    expect(applyOptimisticRemoval).toHaveBeenNthCalledWith(1, ['user-1', 'user-2'])
    expect(applyOptimisticRemoval).toHaveBeenNthCalledWith(2, ['user-1'])
    expect(rollbacks[0]).toHaveBeenCalledTimes(1)
    expect(onInvalidate).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('Removed 1 selected member.')
    expect(onError).toHaveBeenCalledWith('Grace Hopper: Permission denied.')
  })
})
