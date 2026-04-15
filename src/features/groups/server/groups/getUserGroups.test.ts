import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetUser, mockFindMany } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFindMany: vi.fn(),
}))

vi.mock('@/shared/supabase/server', () => ({
  getUser: mockGetUser,
}))

vi.mock('@/shared/lib/prismaClient', () => ({
  prisma: {
    group_member: {
      findMany: mockFindMany,
    },
  },
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
})
