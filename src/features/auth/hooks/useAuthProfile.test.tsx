import type { User } from '@supabase/supabase-js'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthProfile } from './useAuthProfile'

const {
  mockGetBrowserE2EAuthMode,
  getOrCreateProfileToken,
  mockIsE2EAnonymousAuthMode,
  mockGetOrCreateProfileFn,
  mockGetUser,
  mockOnAuthStateChange,
  mockOptimizeImageFromUrl,
  mockUpdateProfileFn,
  updateProfileToken,
} = vi.hoisted(() => ({
  mockGetBrowserE2EAuthMode: vi.fn(),
  getOrCreateProfileToken: Symbol('getOrCreateProfile'),
  mockIsE2EAnonymousAuthMode: vi.fn(),
  updateProfileToken: Symbol('updateProfile'),
  mockGetOrCreateProfileFn: vi.fn(),
  mockGetUser: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
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

vi.mock('../lib/e2eAuth', () => ({
  getBrowserE2EAuthMode: mockGetBrowserE2EAuthMode,
  isE2EAnonymousAuthMode: mockIsE2EAnonymousAuthMode,
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
  } as User
}

describe('useAuthProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
    mockGetBrowserE2EAuthMode.mockReturnValue(null)
    mockIsE2EAnonymousAuthMode.mockReturnValue(false)
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

  it('starts in a settled logged-out state for anonymous e2e mode', () => {
    mockGetBrowserE2EAuthMode.mockReturnValue('anonymous')
    mockIsE2EAnonymousAuthMode.mockReturnValue(true)

    const setUserLoggedIn = vi.fn()
    const { result } = renderHook(() => useAuthProfile(setUserLoggedIn))

    expect(result.current.loading).toBe(false)
    expect(result.current.profile).toEqual({
      full_name: null,
      avatar_url: null,
    })
    expect(setUserLoggedIn).toHaveBeenCalledWith(false)
  })
})
