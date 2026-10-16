import { beforeEach, describe, expect, it, vi } from 'vitest'
import { groupSchema } from '@/features/groups/schemas/groupForm'
import { turnstileTokenSchema } from '@/shared/turnstile/constants'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findProfiles: vi.fn(),
  transaction: vi.fn(),
  createGroup: vi.fn(),
  createRole: vi.fn(),
  createMembers: vi.fn(),
  ensureAuthUserForInvite: vi.fn(),
  upsertInviteProfile: vi.fn(),
  inviteUserByEmail: vi.fn(),
  verifyTurnstileToken: vi.fn(),
}))

vi.mock('@/shared/supabase/server', () => ({ getUser: mocks.getUser }))
vi.mock('@/shared/server/prisma', () => ({
  getPrismaClient: () => ({
    profile: { findMany: mocks.findProfiles },
    $transaction: mocks.transaction,
  }),
}))
vi.mock('@/shared/turnstile/server', () => ({
  verifyTurnstileToken: mocks.verifyTurnstileToken,
}))
vi.mock('./groupManagement', () => ({
  ensureAuthUserForInvite: mocks.ensureAuthUserForInvite,
  upsertInviteProfile: mocks.upsertInviteProfile,
}))

const { createGroupFromForm } = await import('./createGroup')
const createGroupRequestSchema = groupSchema.extend(turnstileTokenSchema.shape)

async function createGroup({ data }: { data: unknown }) {
  return createGroupFromForm(createGroupRequestSchema.parse(data))
}

const request = {
  groupName: 'Research group',
  groupDescription: '',
  roles: [{ title: 'Teacher' }, { title: 'Student' }],
  assignedRole: 'Teacher',
  members: [{ email: 'member@example.com', title: 'Student' }],
  turnstileToken: 'token',
}

describe('createGroup role validation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.verifyTurnstileToken.mockResolvedValue({ success: true })
    mocks.getUser.mockResolvedValue({ id: 'creator', email: 'creator@example.com' })
    mocks.findProfiles.mockResolvedValue([])
    mocks.ensureAuthUserForInvite.mockResolvedValue({
      user: { id: 'member', email: 'member@example.com' },
      serviceRoleSupabase: { auth: { admin: { inviteUserByEmail: mocks.inviteUserByEmail } } },
    })
    mocks.createGroup.mockResolvedValue({ id: 'group' })
    mocks.createRole.mockImplementation(async ({ data }: { data: { title: string } }) => ({
      ...data,
      id: data.title === 'Teacher' ? 1n : 2n,
    }))
    const transactionClient = {
      group: { create: mocks.createGroup },
      group_role: { create: mocks.createRole },
      group_member: { createMany: mocks.createMembers },
    }
    mocks.transaction.mockImplementation(async (operation: (tx: typeof transactionClient) => Promise<unknown>) => operation(transactionClient))
  })

  it.each([
    { assignedRole: 'Unknown' },
    { members: [{ email: 'member@example.com', title: 'Unknown' }] },
    { members: [{ email: 'member@example.com', title: 'student' }] },
  ])('rejects unknown role references before provisioning invited users: %j', async (invalidRoles) => {
    const result = await createGroup({ data: { ...request, ...invalidRoles } })

    expect(result.success).toBe(false)
    expect(mocks.findProfiles).not.toHaveBeenCalled()
    expect(mocks.ensureAuthUserForInvite).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('trims role references and assigns the requested role to invited users', async () => {
    const result = await createGroup({
      data: {
        ...request,
        roles: [{ title: ' Teacher ' }, { title: ' Student ' }],
        assignedRole: ' Teacher ',
        members: [{ email: ' MEMBER@example.com ', title: ' Student ' }],
      },
    })

    expect(result.success).toBe(true)
    expect(mocks.ensureAuthUserForInvite).toHaveBeenCalledWith('member@example.com')
    expect(mocks.createMembers).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ user_id: 'creator', role_id: 1n, permission: 'owner' }),
        expect.objectContaining({ user_id: 'member', role_id: 2n, permission: 'member' }),
      ],
    })
  })

  it('supports role titles that are object prototype property names', async () => {
    const result = await createGroup({
      data: { ...request, roles: [{ title: '__proto__' }], assignedRole: '__proto__', members: [] },
    })

    expect(result.success).toBe(true)
    expect(mocks.createMembers).toHaveBeenCalledWith({
      data: [expect.objectContaining({ user_id: 'creator', role_id: 2n })],
    })
  })
})
