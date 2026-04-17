import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountForm from './AccountForm'

const {
  mockInvalidate,
  mockToastError,
  mockToastSuccess,
  mockUpdateProfile,
} = vi.hoisted(() => ({
  mockInvalidate: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockUpdateProfile: vi.fn(),
}))

function mockUseRouter() {
  return {
    invalidate: mockInvalidate,
  }
}

function mockUseServerFn() {
  return mockUpdateProfile
}

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useRouter: mockUseRouter,
  }
})

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>()
  return {
    ...actual,
    useServerFn: mockUseServerFn,
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}))

describe('accountForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateProfile.mockResolvedValue({
      success: true,
      message: 'Profile updated successfully',
    })
  })

  it('clears the previous success feedback once the form becomes dirty again', async () => {
    const user = userEvent.setup()

    render(
      <AccountForm
        full_name="Ada Lovelace"
        avatar_url={null}
        email="ada@example.com"
      />,
    )

    await user.clear(screen.getByLabelText('Full name'))
    await user.type(screen.getByLabelText('Full name'), 'Ada Byron')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Profile updated successfully')).toBeVisible()

    await user.clear(screen.getByLabelText('Full name'))
    await user.type(screen.getByLabelText('Full name'), 'Ada King')

    await waitFor(() => {
      expect(screen.queryByText('Profile updated successfully')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Save profile changes when you are ready.')).toBeVisible()
    expect(screen.queryByText('You have unsaved profile changes.')).not.toBeInTheDocument()
  })

  it('uses a warning treatment while profile changes are unsaved', async () => {
    const user = userEvent.setup()

    render(
      <AccountForm
        full_name="Ada Lovelace"
        avatar_url={null}
        email="ada@example.com"
      />,
    )

    await user.clear(screen.getByLabelText('Full name'))
    await user.type(screen.getByLabelText('Full name'), 'Ada Byron')

    expect(screen.getByText('Save profile changes when you are ready.').closest('div')).toHaveClass(
      'border-amber-300/70',
      'bg-amber-50/90',
    )
  })

  it('shows success feedback before router invalidation settles', async () => {
    const user = userEvent.setup()

    mockInvalidate.mockImplementationOnce(async () => {
      await new Promise(() => {})
    })

    render(
      <AccountForm
        full_name="Ada Lovelace"
        avatar_url={null}
        email="ada@example.com"
      />,
    )

    await user.clear(screen.getByLabelText('Full name'))
    await user.type(screen.getByLabelText('Full name'), 'Ada Byron')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Profile updated successfully')).toBeVisible()
    expect(mockToastSuccess).toHaveBeenCalledWith('Profile updated successfully')
    expect(mockInvalidate).toHaveBeenCalledTimes(1)
  })
})
