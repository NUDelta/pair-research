import type { z } from 'zod'
import type { ContactFormValues } from '@/features/contact/schemas/contact'
import type { TurnstileAwareActionResponse } from '@/shared/turnstile/constants'
import { render } from '@react-email/render'
import { createServerFn } from '@tanstack/react-start'
import { createElement } from 'react'
import ContactMessageEmail from '@/features/contact/email/ContactMessageEmail'
import { contactFormSchema } from '@/features/contact/schemas/contact'
import { SITE_BASE_URL } from '@/shared/config/constants'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'

const sendContactMessageSchema = contactFormSchema.merge(turnstileTokenSchema)
type SendContactMessageValues = z.infer<typeof sendContactMessageSchema>

const CONTACT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const CONTACT_RATE_LIMIT_MAX_MESSAGES = 3
const contactMessageAttempts = new Map<string, number[]>()

interface SendContactMessageDependencies {
  sendEmail?: (values: ContactFormValues) => Promise<unknown>
  verifyToken?: typeof verifyTurnstileToken
}

interface BuildResendEmailPayloadInput {
  from: string
  html: string
  to: string
  values: ContactFormValues
}

export function buildContactEmailSubject(name: string) {
  return `Pair Research contact: ${name}`
}

export function buildContactEmailText({ email, message, name }: ContactFormValues) {
  return [
    'New Pair Research contact message',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Site: ${SITE_BASE_URL || 'unknown'}`,
    '',
    message,
  ].join('\n')
}

export async function renderContactEmailHtml(values: ContactFormValues) {
  return render(createElement(ContactMessageEmail, {
    ...values,
    siteBaseUrl: SITE_BASE_URL,
  }))
}

export function buildResendEmailPayload({ from, html, to, values }: BuildResendEmailPayloadInput) {
  return {
    from,
    to,
    reply_to: values.email,
    subject: buildContactEmailSubject(values.name),
    text: buildContactEmailText(values),
    html,
  }
}

function getContactRateLimitKey(email: string) {
  return email.trim().toLowerCase()
}

function isContactRateLimited(email: string, now = Date.now()) {
  const key = getContactRateLimitKey(email)
  const windowStart = now - CONTACT_RATE_LIMIT_WINDOW_MS
  const recentAttempts = (contactMessageAttempts.get(key) ?? []).filter(timestamp => timestamp > windowStart)

  if (recentAttempts.length >= CONTACT_RATE_LIMIT_MAX_MESSAGES) {
    contactMessageAttempts.set(key, recentAttempts)
    return true
  }

  contactMessageAttempts.set(key, [...recentAttempts, now])
  return false
}

export function resetContactMessageRateLimitForTest() {
  contactMessageAttempts.clear()
}

export async function handleSendContactMessage(
  data: SendContactMessageValues,
  dependencies: SendContactMessageDependencies = {},
): Promise<TurnstileAwareActionResponse> {
  const turnstile = await (dependencies.verifyToken ?? verifyTurnstileToken)({
    action: 'contact',
    token: data.turnstileToken,
  })

  if (!turnstile.success) {
    return createTurnstileErrorResponse(
      turnstile.message,
      turnstile.code ?? TURNSTILE_ERROR_CODES.failed,
    )
  }

  if (isContactRateLimited(data.email)) {
    return {
      success: false,
      message: 'Please wait before sending another message.',
    }
  }

  try {
    if (dependencies.sendEmail === undefined) {
      throw new Error('Contact email sender is not configured.')
    }

    await dependencies.sendEmail(data)

    return {
      success: true,
      message: 'Message sent. We will follow up as soon as we can.',
    }
  }
  catch (error) {
    console.error('[CONTACT_MESSAGE_FAILED]', error)
    return {
      success: false,
      message: 'We could not send your message right now. Please try again later.',
    }
  }
}

export const sendContactMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => sendContactMessageSchema.parse(data))
  .handler(async ({ data }): Promise<TurnstileAwareActionResponse> => {
    const { sendResendEmail } = await import('./sendResendEmail.server')
    return handleSendContactMessage(data, { sendEmail: sendResendEmail })
  })
