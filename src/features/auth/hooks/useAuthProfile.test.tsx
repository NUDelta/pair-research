import type { User } from '@supabase/supabase-js'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthProfile } from './useAuthProfile'

const {
  getOrCreateProfileToken,
  mockGetOrCreateProfileFn,
  mockGetUser,
  mockOnAuthStateChange,
  mockOptimizeImageFromUrl,
  mockUpdateProfileFn,
  updateProfileToken,
} = vi.hoisted(() => ({
  getOrCreateProfileToken: Symbol('getOrCreateProfile'),
  updateProfileToken: Symbol('updateProfile'),
  mockGetOrCreateProfileFn: vi.fn(),
  mockGetUser: vi.fn(),
  mockOnAuthStateChange: vi.fn<(callback: (event: string, session: { user: User } | null) => void) => unknown>(),
  mockOptimizeImageFromUrl: vi.fn(),
  mockUpdateProfileFn: vi.fn(),
}))

vi.mock('@/features/account/server/getOrCreateProfile', () => ({
  getOrCreateProfile: getOrCreateProfileToken,
}))

vi.mock('@/features/account/server', () => ({
  updateProfile: updateProfileToken,
}))

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>()
  const resolveServerFn = (serverFn: unknown) =>
    serverFn === getOrCreateProfileToken
      ? mockGetOrCreateProfileFn
      : mockUpdateProfileFn

  return {
    ...actual,
    useServerFn: resolveServerFn,
  }
})

vi.mock('@/features/account/lib/avatar/optimizeImage', () => ({
  optimizeImageFromUrl: mockOptimizeImageFromUrl,
}))

vi.mock('@/shared/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}))

vi.mock('../lib/authErrors', () => ({
  isMissingSupabaseSessionError: () => false,
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

function buildUser(): User {
  return {
    id: 'user-1',
    app_metadata: { provider: 'google', providers: ['google'] },
    aud: 'authenticated',
    confirmation_sent_at: undefined,
    created_at: '2026-04-16T00:00:00.000Z',
    email: 'ada@example.com',
    factors: [],
    identities: [{ provider: 'google' }] as User['identities'],
    is_anonymous: false,
    last_sign_in_at: undefined,
    phone: '',
    role: 'authenticated',
    updated_at: '2026-04-16T00:00:00.000Z',
    user_metadata: {
      avatar_url: 'https://lh3.googleusercontent.com/a/abc=s96-c',
      full_name: 'Ada Lovelace',
    },
  }
}

describe('useAuthProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })
  })

  it('syncs a Google profile avatar through the browser optimizer and stores the R2 copy', async () => {
    const user = buildUser()
    const optimizedBuffer = Uint8Array.from([1, 2, 3]).buffer
    const initialProfile = {
      id: 'user-1',
      email: 'ada@example.com',
      full_name: 'Ada Lovelace',
      avatar_url: 'https://lh3.googleusercontent.com/a/abc=s96-c',
    }
    const syncedProfile = {
      ...initialProfile,
      avatar_url: 'https://cdn.example.com/public/images/avatars/user-1.webp',
    }

    mockGetUser.mockResolvedValue({
      data: { user },
      error: null,
    })
    mockGetOrCreateProfileFn
      .mockResolvedValue(syncedProfile)
      .mockResolvedValueOnce(initialProfile)
      .mockResolvedValueOnce(initialProfile)
    mockOptimizeImageFromUrl.mockResolvedValue(optimizedBuffer)
    mockUpdateProfileFn.mockResolvedValue({ success: true, message: 'ok' })

    const setUserLoggedIn = vi.fn()
    const { result } = renderHook(() => useAuthProfile(setUserLoggedIn))

    await waitFor(() => {
      expect(mockOptimizeImageFromUrl).toHaveBeenCalledWith(
        'https://lh3.googleusercontent.com/a/abc=s512-c',
      )
    })

    await waitFor(() => {
      expect(mockUpdateProfileFn).toHaveBeenCalledWith({
        data: {
          avatarSource: 'upload',
          imageBuffer: optimizedBuffer,
          contentType: 'image/webp',
          expectedUserId: user.id,
          expectedAvatarUrl: initialProfile.avatar_url,
        },
      })
    })

    await waitFor(() => {
      expect(result.current.profile.avatar_url).toBe('https://cdn.example.com/public/images/avatars/user-1.webp')
    })
    expect(setUserLoggedIn).toHaveBeenCalledWith(true)
  })

  it('does not overwrite a newer custom avatar while a Google sync is in flight', async () => {
    const user = buildUser()
    const optimizedBuffer = Uint8Array.from([1, 2, 3]).buffer
    const initialProfile = {
      id: 'user-1',
      email: 'ada@example.com',
      full_name: 'Ada Lovelace',
      avatar_url: 'https://lh3.googleusercontent.com/a/abc=s96-c',
    }
    const customProfile = {
      ...initialProfile,
      avatar_url: 'https://cdn.example.com/public/images/avatars/user-1.webp',
    }

    mockGetUser.mockResolvedValue({
      data: { user },
      error: null,
    })
    mockGetOrCreateProfileFn
      .mockResolvedValue(customProfile)
      .mockResolvedValueOnce(initialProfile)
    mockOptimizeImageFromUrl.mockResolvedValue(optimizedBuffer)
    mockUpdateProfileFn.mockResolvedValue({ success: true, message: 'ok' })

    const setUserLoggedIn = vi.fn()
    const { result } = renderHook(() => useAuthProfile(setUserLoggedIn))

    await waitFor(() => {
      expect(mockOptimizeImageFromUrl).toHaveBeenCalledWith(
        'https://lh3.googleusercontent.com/a/abc=s512-c',
      )
    })

    await waitFor(() => {
      expect(result.current.profile.avatar_url).toBe('https://cdn.example.com/public/images/avatars/user-1.webp')
    })

    expect(mockUpdateProfileFn).not.toHaveBeenCalled()
  })
  it('ignores a profile response that arrives after logout', async () => {
    const user = buildUser()
    let resolveProfile!: (value: { id: string, full_name: string, avatar_url: null }) => void
    const pendingProfile = new Promise<{ id: string, full_name: string, avatar_url: null }>((resolve) => {
      resolveProfile = resolve
    })
    mockGetUser.mockResolvedValue({ data: { user }, error: null })
    mockGetOrCreateProfileFn.mockReturnValue(pendingProfile)
    const setUserLoggedIn = vi.fn()
    const { result } = renderHook(() => useAuthProfile(setUserLoggedIn))
    await waitFor(() => expect(mockGetOrCreateProfileFn).toHaveBeenCalled())
    const onAuthChange = mockOnAuthStateChange.mock.calls[0][0]
    await act(async () => {
      onAuthChange('SIGNED_OUT', null)
      resolveProfile({ id: user.id, full_name: 'Old profile', avatar_url: null })
    })
    expect(result.current.profile).toEqual({ full_name: null, avatar_url: null })
    expect(result.current.loading).toBe(false)
    expect(setUserLoggedIn).not.toHaveBeenCalledWith(true)
  })

  it('discards a Google avatar downloaded for the previous account', async () => {
    const user = buildUser()
    const secondUser = { ...user, id: 'user-2', user_metadata: {} }
    let resolveImage!: (value: ArrayBuffer) => void
    mockOptimizeImageFromUrl.mockReturnValue(new Promise<ArrayBuffer>((resolve) => {
      resolveImage = resolve
    }))
    mockGetUser.mockResolvedValueOnce({ data: { user }, error: null }).mockResolvedValue({ data: { user: secondUser }, error: null })
    mockGetOrCreateProfileFn.mockResolvedValueOnce({ id: user.id, full_name: 'Ada', avatar_url: user.user_metadata.avatar_url }).mockResolvedValue({ id: secondUser.id, full_name: 'Second user', avatar_url: null })
    const setUserLoggedIn = vi.fn()
    const { result } = renderHook(() => useAuthProfile(setUserLoggedIn))
    await waitFor(() => expect(mockOptimizeImageFromUrl).toHaveBeenCalled())
    const onAuthChange = mockOnAuthStateChange.mock.calls[0][0]
    await act(async () => {
      onAuthChange('SIGNED_IN', { user: secondUser })
      resolveImage(new ArrayBuffer(12))
    })
    await waitFor(() => expect(result.current.profile.full_name).toBe('Second user'))
    expect(mockUpdateProfileFn).not.toHaveBeenCalled()
  })

  it('allows a failed Google sync to retry on the next profile refresh', async () => {
    const user = buildUser()
    const initialProfile = { id: user.id, full_name: 'Ada', avatar_url: user.user_metadata.avatar_url }
    mockGetUser.mockResolvedValue({ data: { user }, error: null })
    mockGetOrCreateProfileFn.mockResolvedValue(initialProfile)
    mockOptimizeImageFromUrl.mockResolvedValue(new ArrayBuffer(12))
    mockUpdateProfileFn.mockResolvedValue({ success: false })
    const setUserLoggedIn = vi.fn()
    const { result } = renderHook(() => useAuthProfile(setUserLoggedIn))
    await waitFor(() => expect(mockUpdateProfileFn).toHaveBeenCalledTimes(1))
    await act(async () => {
      await result.current.refreshProfile()
    })
    await waitFor(() => expect(mockUpdateProfileFn).toHaveBeenCalledTimes(2))
  })
})
