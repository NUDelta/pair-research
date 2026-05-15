import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GroupCard from './GroupCard'

const {
  mockAcceptInvitation,
  mockInvalidate,
  mockNavigate,
  mockToastError,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockAcceptInvitation: vi.fn(),
  mockInvalidate: vi.fn(),
  mockNavigate: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

function mockedUseServerFn() {
  return mockAcceptInvitation
}

function MockLink({
  children,
  params,
  to,
}: {
  children: ReactNode
  params?: { slug?: string }
  to: string
}) {
  const href = params?.slug !== undefined
    ? to.replace('$slug', params.slug)
    : to

  return <a href={href}>{children}</a>
}

function mockedUseRouter() {
  return {
    invalidate: mockInvalidate,
    navigate: mockNavigate,
  }
}

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>()

  return {
    ...actual,
    useServerFn: mockedUseServerFn,
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()

  return {
    ...actual,
    Link: MockLink,
    useRouter: mockedUseRouter,
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}))

describe('groupCard', () => {
  beforeEach(() => {
    mockAcceptInvitation.mockReset()
    mockInvalidate.mockReset()
    mockNavigate.mockReset()
    mockToastError.mockReset()
    mockToastSuccess.mockReset()
  })

  it('disables the accept action while an invitation is being accepted', async () => {
    const user = userEvent.setup()
    let resolveInvitation: ((value: ActionResponse) => void) | undefined

    mockAcceptInvitation.mockImplementationOnce(async () =>
      new Promise<ActionResponse>((resolve) => {
        resolveInvitation = resolve
      }))

    render(
      <GroupCard
        group={{
          id: 'group-1',
          groupName: 'Research Collective',
          groupDescription: 'Weekly paper reviews',
          role: 'Member',
          isAdmin: false,
          isPending: true,
          joinedAt: '2026-04-10T10:00:00.000Z',
        }}
      />,
    )

    const acceptButton = screen.getByRole('button', { name: /accept/i })
    await user.click(acceptButton)

    expect(mockAcceptInvitation).toHaveBeenCalledWith({ data: { groupId: 'group-1' } })
    expect(acceptButton).toBeDisabled()
    expect(acceptButton).toHaveAttribute('aria-busy', 'true')

    resolveInvitation?.({ success: true, message: 'Invitation accepted' })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Invitation accepted')
    })
    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalledTimes(1)
    })
  })

  it('shows an error toast when a provided accept handler rejects', async () => {
    const user = userEvent.setup()

    render(
      <GroupCard
        group={{
          id: 'group-1',
          groupName: 'Research Collective',
          groupDescription: 'Weekly paper reviews',
          role: 'Member',
          isAdmin: false,
          isPending: true,
          joinedAt: '2026-04-10T10:00:00.000Z',
        }}
        onAcceptInvitation={vi.fn().mockRejectedValue(new Error('Network down'))}
      />,
    )

    await user.click(screen.getByRole('button', { name: /accept/i }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Network down')
    })
  })

  it('keeps joined group navigation and settings as separate keyboard targets', async () => {
    const user = userEvent.setup()

    render(
      <GroupCard
        href="group-1"
        group={{
          id: 'group-1',
          groupName: 'Research Collective',
          groupDescription: 'Weekly paper reviews',
          role: 'Member',
          isAdmin: true,
          isPending: false,
          joinedAt: '2026-04-10T10:00:00.000Z',
        }}
      />,
    )

    const groupLink = screen.getByRole('link', { name: /Research Collective/i })
    const settingsButton = screen.getByRole('button', { name: 'Open settings for Research Collective' })

    expect(groupLink).toHaveAttribute('href', '/groups/group-1')
    expect(settingsButton.closest('a')).toBeNull()

    await user.click(settingsButton)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/groups/$slug/settings',
      params: { slug: 'group-1' },
    })
  })
})
