import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GoogleOneTap from './GoogleOneTap'

const {
  mockCancel,
  mockGetSession,
  mockInitialize,
  mockPrompt,
  mockSignInWithIdToken,
  mockUseRouterState,
} = vi.hoisted(() => ({
  mockCancel: vi.fn(),
  mockGetSession: vi.fn(),
  mockInitialize: vi.fn(),
  mockPrompt: vi.fn(),
  mockSignInWithIdToken: vi.fn(),
  mockUseRouterState: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useRouterState: mockUseRouterState,
  }
})

vi.mock('@/shared/config/env', () => ({
  getGooglePublicEnv: () => ({
    clientId: 'google-client-id.apps.googleusercontent.com',
  }),
}))

vi.mock('@/shared/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      signInWithIdToken: mockSignInWithIdToken,
    },
  }),
}))

describe('googleOneTap component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.head.innerHTML = ''
    window.google = {
      accounts: {
        id: {
          cancel: mockCancel,
          initialize: mockInitialize,
          prompt: mockPrompt,
        },
      },
    }
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockSignInWithIdToken.mockResolvedValue({ error: null })
    mockUseRouterState.mockReturnValue({ pathname: '/login', searchStr: '' })
  })

  it('initializes and prompts on the login page', async () => {
    render(<GoogleOneTap />)

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledWith(expect.objectContaining({
        client_id: 'google-client-id.apps.googleusercontent.com',
        context: 'signin',
        nonce: expect.any(String),
        use_fedcm_for_prompt: true,
      }))
      expect(mockPrompt).toHaveBeenCalledTimes(1)
    })
  })

  it('retries when client navigation reaches a One Tap route', async () => {
    const { rerender } = render(<GoogleOneTap />)

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalledTimes(1)
    })

    mockPrompt.mockClear()
    mockUseRouterState.mockReturnValue({ pathname: '/privacy', searchStr: '' })
    rerender(<GoogleOneTap />)
    expect(mockPrompt).not.toHaveBeenCalled()

    mockUseRouterState.mockReturnValue({ pathname: '/login', searchStr: '?next=%2Fgroups' })
    rerender(<GoogleOneTap />)

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalledTimes(1)
    })
  })
})
