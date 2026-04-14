import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

const mockUseServerFn = vi.fn()
const mockNavigate = vi.fn()
const mockInvalidate = vi.fn()

function MockOAuthButton() {
  return <div data-testid="oauth-button" />
}

function mockUseNavigate() {
  return mockNavigate
}

function mockUseRouter() {
  return { invalidate: mockInvalidate }
}

function mockUseServerFnHook() {
  return mockUseServerFn
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (globalThis.ResizeObserver === undefined) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
}

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>()
  return {
    ...actual,
    useServerFn: mockUseServerFnHook,
  }
})

vi.mock('@tanstack/react-router', () => ({
  useNavigate: mockUseNavigate,
  useRouter: mockUseRouter,
}))

vi.mock('./OAuthButton', () => ({
  OAuthButton: MockOAuthButton,
}))

vi.mock('@/shared/turnstile/TurnstileField', () => {
  return {
    __esModule: true,
    default: ({ onVerifiedChange }: { onVerifiedChange?: (verified: boolean) => void }) => (
      <div>
        <button type="button" onClick={() => onVerifiedChange?.(true)}>
          Verify turnstile
        </button>
        <button type="button" onClick={() => onVerifiedChange?.(false)}>
          Reset turnstile
        </button>
      </div>
    ),
  }
})

describe('auth forms turnstile gating', () => {
  beforeEach(() => {
    mockUseServerFn.mockReset()
    mockNavigate.mockReset()
    mockInvalidate.mockReset()
  })

  it('keeps sign-in disabled until turnstile is verified', async () => {
    const user = userEvent.setup()

    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'learner@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')

    const submitButton = screen.getByRole('button', { name: /^sign in$/i })
    expect(submitButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /verify turnstile/i }))
    expect(submitButton).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /reset turnstile/i }))
    expect(submitButton).toBeDisabled()
  })

  it('keeps sign-up disabled until terms and turnstile are both satisfied', async () => {
    const user = userEvent.setup()

    render(<SignupForm />)

    await user.type(screen.getByLabelText('Full Name'), 'Test User')
    await user.type(screen.getByLabelText('Email'), 'learner@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm Password'), 'password123')

    const submitButton = screen.getByRole('button', { name: /^create account$/i })
    expect(submitButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /verify turnstile/i }))
    expect(submitButton).toBeDisabled()

    await user.click(screen.getByRole('checkbox'))
    expect(submitButton).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /reset turnstile/i }))
    expect(submitButton).toBeDisabled()
  })
})
