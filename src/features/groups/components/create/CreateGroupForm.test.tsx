import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TURNSTILE_ERROR_CODES } from '@/shared/turnstile/constants'
import CreateGroupForm from './CreateGroupForm'

const {
  mockUseServerFn,
  mockNavigate,
  mockEnsureToken,
  mockRequireInteractiveChallenge,
  mockResetTurnstile,
  mockToastError,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockUseServerFn: vi.fn(),
  mockNavigate: vi.fn(),
  mockEnsureToken: vi.fn(),
  mockRequireInteractiveChallenge: vi.fn(),
  mockResetTurnstile: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

function mockUseNavigate() {
  return mockNavigate
}

function mockUseServerFnHook() {
  return mockUseServerFn
}

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>()
  return {
    ...actual,
    useServerFn: mockUseServerFnHook,
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: mockUseNavigate,
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}))

vi.mock('@/shared/turnstile/TurnstileField', () => ({
  __esModule: true,
  default: ({ controllerRef }: { controllerRef?: { current: unknown } }) => {
    if (controllerRef !== undefined) {
      controllerRef.current = {
        ensureToken: mockEnsureToken,
        getToken: () => null,
        requireInteractiveChallenge: mockRequireInteractiveChallenge,
        reset: mockResetTurnstile,
      }
    }

    return <div data-testid="turnstile-field" />
  },
}))

describe('createGroupForm', () => {
  beforeEach(() => {
    mockUseServerFn.mockReset()
    mockNavigate.mockReset()
    mockEnsureToken.mockReset()
    mockRequireInteractiveChallenge.mockReset()
    mockResetTurnstile.mockReset()
    mockToastError.mockReset()
    mockToastSuccess.mockReset()
    mockUseServerFn.mockResolvedValue({ success: true, message: 'Created' })
    mockEnsureToken.mockResolvedValue('turnstile-token')
  })

  it('does not submit until turnstile returns a token', async () => {
    const user = userEvent.setup()
    mockEnsureToken.mockResolvedValueOnce(null)

    render(<CreateGroupForm />)

    await user.type(screen.getByLabelText('Group name'), 'Systems Biology Lab')
    await user.click(screen.getByRole('button', { name: /create group/i }))

    expect(mockUseServerFn).not.toHaveBeenCalled()
    expect(await screen.findByText(/please complete the security check to continue/i)).toBeVisible()
  })

  it('requests an interactive turnstile challenge when the server requires it', async () => {
    const user = userEvent.setup()
    mockUseServerFn.mockResolvedValueOnce({
      success: false,
      message: 'Please confirm you are human to continue.',
      code: TURNSTILE_ERROR_CODES.required,
    })

    render(<CreateGroupForm />)

    await user.type(screen.getByLabelText('Group name'), 'Systems Biology Lab')
    await user.click(screen.getByRole('button', { name: /create group/i }))

    await waitFor(() => {
      expect(mockUseServerFn).toHaveBeenCalled()
    })

    const firstCall = mockUseServerFn.mock.calls[0]?.[0] as unknown as {
      data: {
        groupName: string
        turnstileToken: string
      }
    }

    expect(firstCall.data.groupName).toBe('Systems Biology Lab')
    expect(firstCall.data.turnstileToken).toBe('turnstile-token')

    expect(mockResetTurnstile).toHaveBeenCalled()
    expect(mockRequireInteractiveChallenge).toHaveBeenCalledWith('Please confirm you are human to continue.')
    expect(await screen.findByText(/please confirm you are human to continue/i)).toBeVisible()
  })

  it('imports a pasted list of invite emails into prepared rows', async () => {
    const user = userEvent.setup()

    render(<CreateGroupForm />)

    await user.type(
      screen.getByLabelText('Paste emails'),
      'first@example.com, second@example.com',
    )
    await user.click(screen.getByRole('button', { name: /import list/i }))

    expect(screen.getByDisplayValue('first@example.com')).toBeVisible()
    expect(screen.getByDisplayValue('second@example.com')).toBeVisible()
  })

  it('blocks duplicate invite emails that differ only by casing', async () => {
    const user = userEvent.setup()

    render(<CreateGroupForm />)

    await user.type(screen.getByLabelText('Group name'), 'Systems Biology Lab')
    await user.click(screen.getByRole('button', { name: /add blank row/i }))
    await user.click(screen.getByRole('button', { name: /add blank row/i }))

    const emailInputs = screen.getAllByPlaceholderText('member@example.com')
    await user.type(emailInputs[0], 'First@Example.com')
    await user.type(emailInputs[1], 'first@example.com')
    await user.click(screen.getByRole('button', { name: /create group/i }))

    expect(mockUseServerFn).not.toHaveBeenCalled()
    expect(await screen.findByText(/each email address can only be invited once/i)).toBeVisible()
  })
})
