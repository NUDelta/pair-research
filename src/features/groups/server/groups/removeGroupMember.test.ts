// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { performMemberRemoval } from './removeGroupMember.server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findManagedGroup: vi.fn(),
  reconcile: vi.fn(),
  tx: {
    group_member: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    group: { findUnique: vi.fn() },
    task: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    task_help_capacity: { deleteMany: vi.fn() },
  },
}))
vi.mock('@/shared/supabase/server', () => ({ getUser: mocks.getUser }))
vi.mock('./groupManagement', () => ({
  findManagedGroup: mocks.findManagedGroup,
  withSerializableRetry: async (action: () => Promise<unknown>) => action(),
}))
vi.mock('@/shared/server/cloudflare/bindings.server', () => ({
  getGroupSession: () => ({ reconcileRemovedMember: mocks.reconcile }),
}))
const joined = '2026-10-16T12:00:00.000Z'
const request = { groupId: 'group', userId: 'member', expectedJoinedAt: joined }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ id: 'owner' })
  mocks.findManagedGroup.mockResolvedValue({ prisma: { $transaction: async (action: (tx: typeof mocks.tx) => Promise<unknown>) => action(mocks.tx) } })
  mocks.tx.group_member.findFirst.mockResolvedValue({ permission: 'owner' })
  mocks.tx.group.findUnique.mockResolvedValue({ active_pairing_id: null })
  mocks.tx.group_member.findMany.mockResolvedValue([
    { user_id: 'owner', permission: 'owner', is_pending: false },
    { user_id: 'member', permission: 'member', is_pending: false },
  ])
  mocks.tx.group_member.findUnique.mockResolvedValue({ is_pending: false, joined_at: new Date(joined) })
  mocks.tx.task.findMany.mockResolvedValue([])
  mocks.tx.task.findUnique.mockResolvedValue(null)
  mocks.reconcile.mockResolvedValue({ success: true })
})
describe('member removal recovery', () => {
  it('retries realtime cleanup after membership deletion without repeating writes', async () => {
    mocks.reconcile.mockRejectedValueOnce(new Error('DO unavailable'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await performMemberRemoval(request)).toMatchObject({ success: false })
    mocks.tx.group_member.findUnique.mockResolvedValue(null)
    expect(await performMemberRemoval(request)).toMatchObject({ success: true })
    expect(mocks.tx.group_member.delete).toHaveBeenCalledTimes(1)
    expect(mocks.reconcile).toHaveBeenCalledTimes(2)
    log.mockRestore()
  })
  it('preserves a newly joined membership when an old removal is retried', async () => {
    mocks.tx.group_member.findUnique.mockResolvedValue({ is_pending: true, joined_at: new Date('2026-10-16T13:00:00.000Z') })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await performMemberRemoval(request)).toMatchObject({ success: false, message: 'This membership changed. Refresh before removing it.' })
    expect(mocks.tx.group_member.delete).not.toHaveBeenCalled()
    expect(mocks.reconcile).not.toHaveBeenCalled()
    log.mockRestore()
  })
  it('requires current manager authorization before cleanup retries', async () => {
    mocks.tx.group_member.findFirst.mockResolvedValue(null)
    mocks.tx.group_member.findUnique.mockResolvedValue(null)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await performMemberRemoval(request)).toMatchObject({ success: false })
    expect(mocks.reconcile).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
