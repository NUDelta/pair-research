import type { User } from '@supabase/supabase-js'
import { renderHook, waitFor } from '@testing-library/react'
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
  getBrowserE2EAuthMode: () => null,
  isE2EAnonymousAuthMode: () => false,
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
})
