import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bulkManageGroupRolesSchema, deleteGroupRoleSchema } from '../../schemas/groupManagement'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findManagedGroup: vi.fn(),
  transaction: vi.fn(),
  findActor: vi.fn(),
  findRoles: vi.fn(),
  findMembers: vi.fn(),
  createRole: vi.fn(),
  updateMembers: vi.fn(),
  deleteRole: vi.fn(),
  deleteRoles: vi.fn(),
}))

vi.mock('@/shared/supabase/server', () => ({ getUser: mocks.getUser }))
vi.mock('./groupManagement', async (importOriginal) => {
  const original = await importOriginal<typeof import('./groupManagement')>()
  return { ...original, findManagedGroup: mocks.findManagedGroup }
})

const { performRoleDeletion } = await import('./deleteGroupRole')
const { performBulkRoleAction } = await import('./bulkManageGroupRoles')

async function deleteGroupRole({ data }: { data: unknown }) {
  return performRoleDeletion(deleteGroupRoleSchema.parse(data))
}

async function bulkManageGroupRoles({ data }: { data: unknown }) {
  return performBulkRoleAction(bulkManageGroupRolesSchema.parse(data))
}

const groupId = '11111111-1111-4111-8111-111111111111'
const member = { user_id: 'target', role_id: 1n, permission: 'member', is_pending: false }

describe('role reassignment authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getUser.mockResolvedValue({ id: 'actor' })
    mocks.findManagedGroup.mockResolvedValue({
      prisma: { $transaction: mocks.transaction },
      actorPermission: 'owner',
    })
    mocks.findActor.mockResolvedValue({ permission: 'admin' })
    mocks.findRoles.mockResolvedValue([{ id: 1n, title: 'First' }, { id: 2n, title: 'Second' }])
    mocks.findMembers.mockResolvedValue([member])
    mocks.createRole.mockResolvedValue({ id: 3n })
    const transactionClient = {
      group_member: {
        findFirst: mocks.findActor,
        findMany: mocks.findMembers,
        updateMany: mocks.updateMembers,
      },
      group_role: {
        findMany: mocks.findRoles,
        create: mocks.createRole,
        delete: mocks.deleteRole,
        deleteMany: mocks.deleteRoles,
      },
    }
    mocks.transaction.mockImplementation(async (operation: (tx: typeof transactionClient) => Promise<unknown>) => operation(transactionClient))
  })

  it.each([
    { permission: 'owner', is_pending: false },
    { permission: 'admin', is_pending: false },
    { permission: 'owner', is_pending: true },
    { permission: 'admin', is_pending: true },
  ])('prevents admins deleting a role assigned to $permission (pending: $is_pending)', async (privilegedMember) => {
    mocks.findMembers.mockResolvedValue([{ ...member, ...privilegedMember }])

    const result = await deleteGroupRole({ data: { groupId, roleId: '1', replacementRoleId: '2' } })

    expect(result).toEqual({ success: false, message: 'Only group owners can update owners or admins.' })
    expect(mocks.updateMembers).not.toHaveBeenCalled()
    expect(mocks.deleteRole).not.toHaveBeenCalled()
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
  })

  it.each([
    { permission: 'owner', is_pending: false },
    { permission: 'admin', is_pending: false },
    { permission: 'owner', is_pending: true },
    { permission: 'admin', is_pending: true },
  ])('prevents admins merging a role assigned to $permission (pending: $is_pending)', async (privilegedMember) => {
    mocks.findMembers.mockResolvedValue([{ ...member, ...privilegedMember }])

    const result = await bulkManageGroupRoles({
      data: { groupId, roleIds: ['1'], action: 'merge', targetRoleTitle: 'New role' },
    })

    expect(result).toEqual({ success: false, message: 'Only group owners can update owners or admins.' })
    expect(mocks.createRole).not.toHaveBeenCalled()
    expect(mocks.updateMembers).not.toHaveBeenCalled()
    expect(mocks.deleteRoles).not.toHaveBeenCalled()
  })

  it('prevents admins removing privileged member roles through a bulk action', async () => {
    mocks.findMembers.mockResolvedValue([{ ...member, permission: 'owner' }])

    const result = await bulkManageGroupRoles({
      data: { groupId, roleIds: ['1'], action: 'remove', targetRoleId: '2' },
    })

    expect(result.success).toBe(false)
    expect(mocks.updateMembers).not.toHaveBeenCalled()
    expect(mocks.deleteRoles).not.toHaveBeenCalled()
  })

  it('allows admins to delete roles assigned only to members', async () => {
    const result = await deleteGroupRole({ data: { groupId, roleId: '1', replacementRoleId: '2' } })

    expect(result.success).toBe(true)
    expect(mocks.updateMembers).toHaveBeenCalledWith({
      where: { group_id: groupId, role_id: 1n },
      data: { role_id: 2n },
    })
    expect(mocks.deleteRole).toHaveBeenCalledWith({ where: { id: 1n } })
  })

  it('allows admins to merge member roles into a new role', async () => {
    const result = await bulkManageGroupRoles({
      data: { groupId, roleIds: ['1'], action: 'merge', targetRoleTitle: 'New role' },
    })

    expect(result.success).toBe(true)
    expect(mocks.updateMembers).toHaveBeenCalledWith({
      where: { group_id: groupId, role_id: { in: [1n] } },
      data: { role_id: 3n },
    })
    expect(mocks.deleteRoles).toHaveBeenCalled()
  })

  it('allows owners to reassign privileged members without changing their access', async () => {
    mocks.findActor.mockResolvedValue({ permission: 'owner' })
    mocks.findMembers.mockResolvedValue([{ ...member, permission: 'owner', is_pending: true }])

    const result = await bulkManageGroupRoles({
      data: { groupId, roleIds: ['1'], action: 'remove', targetRoleId: '2' },
    })

    expect(result.success).toBe(true)
    expect(mocks.updateMembers).toHaveBeenCalledWith({
      where: { group_id: groupId, role_id: { in: [1n] } },
      data: { role_id: 2n },
    })
  })

  it('allows deleting unassigned roles without reassigning members', async () => {
    mocks.findMembers.mockResolvedValue([])

    const result = await deleteGroupRole({ data: { groupId, roleId: '1' } })

    expect(result.success).toBe(true)
    expect(mocks.updateMembers).not.toHaveBeenCalled()
    expect(mocks.deleteRole).toHaveBeenCalled()
  })

  it('rejects a manager demoted before the transaction starts', async () => {
    mocks.findActor.mockResolvedValue({ permission: 'member' })

    const result = await bulkManageGroupRoles({
      data: { groupId, roleIds: ['1'], action: 'remove', targetRoleId: '2' },
    })

    expect(result).toEqual({ success: false, message: 'Only group managers can manage roles.' })
    expect(mocks.findRoles).not.toHaveBeenCalled()
    expect(mocks.updateMembers).not.toHaveBeenCalled()
  })
})
