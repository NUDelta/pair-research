import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetUser, mockFindMany } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFindMany: vi.fn(),
}))

vi.mock('@/shared/supabase/server', () => ({
  getUser: mockGetUser,
}))

vi.mock('@/shared/server/prisma', () => ({
  getPrismaClient: () => ({
    group_member: {
      findMany: mockFindMany,
    },
  }),
}))

const { loadUserGroups } = await import('./getUserGroups')

describe('getUserGroups', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetUser.mockReset()
    mockFindMany.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('rethrows data-loading failures instead of masking them as an empty dashboard', async () => {
    const databaseError = new Error('database unavailable')

    mockGetUser.mockResolvedValue({ id: 'user-1' })
    mockFindMany.mockRejectedValueOnce(databaseError)

    await expect(loadUserGroups()).rejects.toThrow('database unavailable')
  })

  it('loads all admin group members with one batched query', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' })
    mockFindMany
      .mockResolvedValueOnce([
        {
          group: {
            id: 'group-1',
            name: 'Admin Group One',
            description: null,
            created_at: new Date('2026-04-01T10:00:00.000Z'),
          },
          group_role: { title: 'Professor' },
          is_admin: true,
          is_pending: false,
          joined_at: new Date('2026-04-02T10:00:00.000Z'),
        },
        {
          group: {
            id: 'group-2',
            name: 'Member Group',
            description: 'Member only',
            created_at: new Date('2026-04-03T10:00:00.000Z'),
          },
          group_role: { title: 'Student' },
          is_admin: false,
          is_pending: false,
          joined_at: new Date('2026-04-04T10:00:00.000Z'),
        },
        {
          group: {
            id: 'group-3',
            name: 'Admin Group Two',
            description: 'Second admin group',
            created_at: new Date('2026-04-05T10:00:00.000Z'),
          },
          group_role: { title: 'Lead' },
          is_admin: true,
          is_pending: false,
          joined_at: new Date('2026-04-06T10:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          group_id: 'group-1',
          profile: {
            id: 'member-1',
            full_name: 'Ada Lovelace',
            avatar_url: null,
            email: 'ada@example.com',
          },
          group_role: { title: 'Professor' },
          is_admin: true,
          is_pending: false,
          joined_at: new Date('2026-04-02T10:00:00.000Z'),
        },
        {
          group_id: 'group-3',
          profile: {
            id: 'member-2',
            full_name: 'Grace Hopper',
            avatar_url: null,
            email: 'grace@example.com',
          },
          group_role: { title: 'Lead' },
          is_admin: true,
          is_pending: false,
          joined_at: new Date('2026-04-06T10:00:00.000Z'),
        },
      ])

    const groups = await loadUserGroups()

    expect(mockFindMany).toHaveBeenCalledTimes(2)
    expect(mockFindMany).toHaveBeenNthCalledWith(2, {
      where: {
        group_id: {
          in: ['group-1', 'group-3'],
        },
      },
      include: {
        profile: true,
        group_role: true,
      },
    })
    expect(groups).toHaveLength(3)
    expect(groups[0]).toMatchObject({
      id: 'group-1',
      groupMembers: [
        {
          id: 'member-1',
          fullName: 'Ada Lovelace',
        },
      ],
    })
    expect(groups[2]).toMatchObject({
      id: 'group-3',
      groupMembers: [
        {
          id: 'member-2',
          fullName: 'Grace Hopper',
        },
      ],
    })
  })
})
