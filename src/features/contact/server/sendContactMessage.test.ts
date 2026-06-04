import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TURNSTILE_ERROR_CODES } from '@/shared/turnstile/constants'
import {
  buildContactEmailSubject,
  buildContactEmailText,
  buildResendEmailPayload,
  handleSendContactMessage,
  renderContactEmailHtml,
  resetContactMessageRateLimitForTest,
} from './sendContactMessage'

const contactValues = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Please help me investigate a production contact issue.',
}

describe('contact email helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContactMessageRateLimitForTest()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds a stable admin email subject and text fallback', () => {
    expect(buildContactEmailSubject(contactValues.name)).toBe('Pair Research contact: Ada Lovelace')
    expect(buildContactEmailText(contactValues)).toContain('Name: Ada Lovelace')
    expect(buildContactEmailText(contactValues)).toContain('Email: ada@example.com')
    expect(buildContactEmailText(contactValues)).toContain(contactValues.message)
  })

  it('renders the React Email template and escapes message content', async () => {
    const html = await renderContactEmailHtml({
      ...contactValues,
      message: 'A message with & characters that should be escaped.',
    })

    expect(html).toContain('New contact message')
    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('ada@example.com')
    expect(html).toContain('A message with &amp; characters that should be escaped.')
  })

  it('builds the expected Resend payload', async () => {
    const html = await renderContactEmailHtml(contactValues)

    const payload = buildResendEmailPayload({
      from: 'Pair Research <support@notify.pairresearch.io>',
      html,
      to: 'admin@example.com',
      values: contactValues,
    })

    expect(payload).toMatchObject({
      from: 'Pair Research <support@notify.pairresearch.io>',
      to: 'admin@example.com',
      reply_to: 'ada@example.com',
      subject: 'Pair Research contact: Ada Lovelace',
    })
    expect(payload.text).toContain(contactValues.message)
    expect(payload.html).toContain('New contact message')
  })

  it('returns a turnstile failure without sending email', async () => {
    const sendEmail = vi.fn()

    const result = await handleSendContactMessage(
      {
        ...contactValues,
        turnstileToken: 'token',
      },
      {
        sendEmail,
        verifyToken: async () => ({
          success: false,
          interactive: true,
          message: 'Please complete the security check and try again.',
          code: TURNSTILE_ERROR_CODES.failed,
          errors: ['invalid-input-response'],
        }),
      },
    )

    expect(result).toMatchObject({
      success: false,
      code: TURNSTILE_ERROR_CODES.failed,
    })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('masks Resend failures behind a generic response', async () => {
    const result = await handleSendContactMessage(
      {
        ...contactValues,
        turnstileToken: 'token',
      },
      {
        sendEmail: async () => {
          throw new Error('Resend request failed with status 500.')
        },
        verifyToken: async () => ({
          success: true,
          interactive: false,
          message: 'Security check passed.',
          errors: [],
        }),
      },
    )

    expect(result).toEqual({
      success: false,
      message: 'We could not send your message right now. Please try again later.',
    })
  })

  it('rate limits repeated messages from the same normalized email before sending', async () => {
    const sendEmail = vi.fn(async () => undefined)
    const verifyToken = vi.fn(async () => ({
      success: true,
      interactive: false,
      message: 'Security check passed.',
      errors: [],
    }))

    for (let index = 0; index < 3; index += 1) {
      await expect(handleSendContactMessage(
        {
          ...contactValues,
          email: 'ADA@example.com',
          turnstileToken: `token-${index}`,
        },
        { sendEmail, verifyToken },
      )).resolves.toMatchObject({ success: true })
    }

    await expect(handleSendContactMessage(
      {
        ...contactValues,
        email: 'ada@example.com',
        turnstileToken: 'token-4',
      },
      { sendEmail, verifyToken },
    )).resolves.toEqual({
      success: false,
      message: 'Please wait before sending another message.',
    })

    expect(sendEmail).toHaveBeenCalledTimes(3)
  })
})
