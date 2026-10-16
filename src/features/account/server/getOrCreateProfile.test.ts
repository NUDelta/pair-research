// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadOrCreateProfile } from './getOrCreateProfile.server'

const { getUser, profile } = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: { findUnique: vi.fn(), createMany: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
}))
vi.mock('@/shared/supabase/server', () => ({ getUser }))
vi.mock('@/shared/server/prisma', () => ({ getPrismaClient: async () => ({ profile }) }))
vi.mock('@/shared/server/prisma.server', () => ({ getPrismaClient: async () => ({ profile }) }))

describe('loadOrCreateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profile.findUnique.mockResolvedValue(null)
    getUser.mockResolvedValue({ id: 'user-1', email: ' ada@example.com ', user_metadata: { full_name: ' Ada ', avatar_url: ' https://example.com/a.webp ' } })
  })

  it('ignores duplicate creation attempts during concurrent initialization', async () => {
    let stored: { full_name: string | null, avatar_url: string | null } | undefined
    profile.createMany.mockImplementation(async ({ data }: { data: { full_name: string | null, avatar_url: string | null } }) => {
      stored ??= { full_name: data.full_name, avatar_url: data.avatar_url }
      return { count: 1 }
    })
    profile.findUniqueOrThrow.mockImplementation(async () => ({ ...stored }))
    const results = await Promise.all([loadOrCreateProfile(), loadOrCreateProfile()])
    expect(results).toEqual(Array.from({ length: 2 }, () => ({ full_name: 'Ada', avatar_url: 'https://example.com/a.webp', id: 'user-1', email: 'ada@example.com' })))
    expect(profile.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }))
    expect(profile.updateMany).not.toHaveBeenCalled()
  })

  it('ignores non-string metadata and preserves existing custom profile values', async () => {
    getUser.mockResolvedValue({ id: 'user-1', email: 'ada@example.com', user_metadata: { full_name: { unexpected: true }, avatar_url: 42 } })
    profile.findUnique.mockResolvedValue({ full_name: 'Custom name', avatar_url: 'https://custom.example/avatar.webp' })
    expect(await loadOrCreateProfile()).toMatchObject({ full_name: 'Custom name', avatar_url: 'https://custom.example/avatar.webp' })
    expect(profile.createMany).not.toHaveBeenCalled()
    expect(profile.updateMany).not.toHaveBeenCalled()
  })

  it('does not overwrite a name edited after the initial read', async () => {
    profile.findUnique.mockResolvedValueOnce({ full_name: null, avatar_url: null })
    profile.updateMany.mockResolvedValue({ count: 0 })
    profile.findUniqueOrThrow.mockResolvedValue({ full_name: 'New custom name', avatar_url: null })
    expect(await loadOrCreateProfile()).toMatchObject({ full_name: 'New custom name' })
    expect(profile.updateMany).toHaveBeenCalledWith({ where: { id: 'user-1', full_name: null }, data: { full_name: 'Ada' } })
  })
  it('discards malformed metadata when creating a missing profile', async () => {
    getUser.mockResolvedValue({ id: 'user-1', email: 'ada@example.com', user_metadata: { full_name: 1, avatar_url: {} } })
    profile.findUniqueOrThrow.mockResolvedValue({ full_name: null, avatar_url: null })
    expect(await loadOrCreateProfile()).toMatchObject({ full_name: null, avatar_url: null })
    expect(profile.createMany).toHaveBeenCalledWith({ data: { id: 'user-1', email: 'ada@example.com', full_name: null, avatar_url: null }, skipDuplicates: true })
  })
})
