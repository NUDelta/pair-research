import type { RefObject } from 'react'
import type { TurnstileFieldHandle } from '@/shared/turnstile/TurnstileField'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContactForm from './ContactForm'

const {
  mockSendContactMessage,
  mockToastError,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockSendContactMessage: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

function mockUseServerFn() {
  return mockSendContactMessage
}

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

function MockTurnstileField({
  controllerRef,
  onVerifiedChange,
}: {
  controllerRef?: RefObject<TurnstileFieldHandle | null>
  onVerifiedChange?: (verified: boolean) => void
}) {
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (controllerRef == null) {
      return
    }

    controllerRef.current = {
      ensureToken: async () => verified ? 'turnstile-token' : null,
      getToken: () => verified ? 'turnstile-token' : null,
      requireInteractiveChallenge: vi.fn(),
      reset: () => {
        setVerified(false)
        onVerifiedChange?.(false)
      },
    }

    return () => {
      controllerRef.current = null
    }
  }, [controllerRef, onVerifiedChange, verified])

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setVerified(true)
          onVerifiedChange?.(true)
        }}
      >
        Verify turnstile
      </button>
      <button
        type="button"
        onClick={() => {
          setVerified(false)
          onVerifiedChange?.(false)
        }}
      >
        Reset turnstile
      </button>
    </div>
  )
}

vi.mock('@/shared/turnstile/TurnstileField', () => {
  return {
    __esModule: true,
    default: MockTurnstileField,
  }
})

async function fillValidContactForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Ada Lovelace')
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Message'), 'Please help me investigate a production contact issue.')
}

describe('contact form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendContactMessage.mockResolvedValue({
      success: true,
      message: 'Message sent. We will follow up as soon as we can.',
    })
  })

  it('keeps submission disabled until contact fields and Turnstile are valid', async () => {
    const user = userEvent.setup()
    render(<ContactForm />)

    const submitButton = screen.getByRole('button', { name: /send message/i })
    expect(submitButton).toBeDisabled()

    await fillValidContactForm(user)
    expect(submitButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /verify turnstile/i }))
    expect(submitButton).toBeEnabled()
  })

  it('sends the contact message with a Turnstile token', async () => {
    const user = userEvent.setup()
    render(<ContactForm />)

    await fillValidContactForm(user)
    await user.click(screen.getByRole('button', { name: /verify turnstile/i }))
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(mockSendContactMessage).toHaveBeenCalledWith({
        data: {
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          message: 'Please help me investigate a production contact issue.',
          turnstileToken: 'turnstile-token',
        },
      })
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Message sent. We will follow up as soon as we can.')
    expect(await screen.findByText('Message sent')).toBeVisible()
  })

  it('uses a generic error for unexpected server function failures', async () => {
    const user = userEvent.setup()
    mockSendContactMessage.mockRejectedValueOnce(new Error('Internal provider details'))

    render(<ContactForm />)

    await fillValidContactForm(user)
    await user.click(screen.getByRole('button', { name: /verify turnstile/i }))
    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(await screen.findByText('We could not send your message right now. Please try again later.')).toBeVisible()
    expect(mockToastError).toHaveBeenCalledWith('We could not send your message right now. Please try again later.')
    expect(screen.queryByText('Internal provider details')).not.toBeInTheDocument()
  })
})
