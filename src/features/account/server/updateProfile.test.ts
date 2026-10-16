// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleUpdateProfile } from './updateProfile.server'

const { getUser, profile, objects } = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: { findUniqueOrThrow: vi.fn(), updateMany: vi.fn() },
  objects: new Map<string, Uint8Array>(),
}))
vi.mock('@/shared/supabase/server', () => ({ getUser }))
vi.mock('@/shared/server/prisma', () => ({ getPrismaClient: async () => ({ profile }) }))
vi.mock('@/shared/server/prisma.server', () => ({ getPrismaClient: async () => ({ profile }) }))
vi.mock('@/shared/server/cloudflare/r2', () => ({
  getObjectUrl: (key: string) => `https://r2.example.com/${key}`,
  putObject: async (key: string, bytes: Uint8Array) => { objects.set(key, bytes) },
  deleteObject: async (key: string) => { objects.delete(key) },
}))

const oldUrl = 'https://r2.example.com/images/avatars/user-1.webp'
const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]).buffer
const avif = Uint8Array.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]).buffer

async function upload(imageBuffer = webp, contentType: 'image/webp' | 'image/avif' = 'image/webp') {
  return handleUpdateProfile({ avatarSource: 'upload', imageBuffer, contentType })
}

describe('handleUpdateProfile', () => {
  let currentUrl: string | null
  beforeEach(() => {
    vi.clearAllMocks()
    objects.clear()
    objects.set('images/avatars/user-1.webp', new Uint8Array(webp))
    currentUrl = oldUrl
    getUser.mockResolvedValue({ id: 'user-1', email: 'ada@example.com' })
    profile.findUniqueOrThrow.mockImplementation(async () => ({ avatar_url: currentUrl, full_name: 'Ada' }))
    profile.updateMany.mockImplementation(async ({ where, data }: { where: { avatar_url?: string | null }, data: { avatar_url?: string | null } }) => {
      if (where.avatar_url !== undefined && where.avatar_url !== currentUrl) {
        return { count: 0 }
      }
      if ('avatar_url' in data) {
        currentUrl = data.avatar_url ?? null
      }
      return { count: 1 }
    })
  })

  it('lets one concurrent replacement win without deleting its object', async () => {
    let reads = 0
    let release!: () => void
    const bothRead = new Promise<void>((resolve) => {
      release = resolve
    })
    profile.findUniqueOrThrow.mockImplementation(async () => {
      const snapshot = { avatar_url: currentUrl, full_name: 'Ada' }
      reads += 1
      if (reads === 2) {
        release()
      }
      await bothRead
      return snapshot
    })
    const results = await Promise.all([upload(), upload(avif, 'image/avif')])
    expect(results.filter(result => result.success)).toHaveLength(1)
    expect(currentUrl).not.toBe(oldUrl)
    expect(objects.size).toBe(1)
    expect(objects.has(new URL(currentUrl!).pathname.slice(1))).toBe(true)
  })

  it('keeps the published object and removes the new revision when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    profile.updateMany.mockRejectedValueOnce(new Error('database unavailable'))
    expect((await upload()).success).toBe(false)
    expect(currentUrl).toBe(oldUrl)
    expect([...objects.keys()]).toEqual(['images/avatars/user-1.webp'])
  })

  it('preserves the published object when avatar removal cannot commit', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    profile.updateMany.mockRejectedValueOnce(new Error('database unavailable'))
    expect((await handleUpdateProfile({ avatarSource: 'none' })).success).toBe(false)
    expect(objects.has('images/avatars/user-1.webp')).toBe(true)
  })

  it('refuses Google sync after a session change before uploading', async () => {
    const result = await handleUpdateProfile({
      avatarSource: 'upload',
      imageBuffer: webp,
      contentType: 'image/webp',
      expectedUserId: 'previous-user',
      expectedAvatarUrl: oldUrl,
    })
    expect(result.success).toBe(false)
    expect(profile.findUniqueOrThrow).not.toHaveBeenCalled()
    expect(objects.size).toBe(1)
  })

  it('refuses Google sync when a custom avatar has already replaced the observed URL', async () => {
    const result = await handleUpdateProfile({
      avatarSource: 'upload',
      imageBuffer: webp,
      contentType: 'image/webp',
      expectedUserId: 'user-1',
      expectedAvatarUrl: 'https://lh3.googleusercontent.com/old',
    })
    expect(result.success).toBe(false)
    expect(profile.updateMany).not.toHaveBeenCalled()
    expect(objects.size).toBe(1)
  })
  it('preserves a custom avatar committed while Google sync is uploading', async () => {
    let replaceDuringWrite = true
    profile.updateMany.mockImplementation(async () => {
      if (replaceDuringWrite) {
        currentUrl = 'https://custom.example/avatar.webp'
        replaceDuringWrite = false
      }
      return { count: 0 }
    })
    const result = await handleUpdateProfile({
      avatarSource: 'upload',
      imageBuffer: webp,
      contentType: 'image/webp',
      expectedUserId: 'user-1',
      expectedAvatarUrl: oldUrl,
    })
    expect(result.success).toBe(false)
    expect(currentUrl).toBe('https://custom.example/avatar.webp')
    expect([...objects.keys()]).toEqual(['images/avatars/user-1.webp'])
  })
})
