import type { ContactFormValues } from '@/features/contact/schemas/contact'
import type { TurnstileAwareActionResponse } from '@/shared/turnstile/constants'
import { render } from '@react-email/render'
import { createServerFn } from '@tanstack/react-start'
import { createElement } from 'react'
import { z } from 'zod'
import ContactMessageEmail from '@/features/contact/email/ContactMessageEmail'
import { contactFormSchema } from '@/features/contact/schemas/contact'
import { SITE_BASE_URL } from '@/shared/config/constants'
import { getRequiredServerEnv } from '@/shared/server/env.server'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'
import { isTurnstileVerificationBypassed } from '@/shared/turnstile/serverBypass'

const resendEmailResponseSchema = z.object({
  id: z.string().optional(),
})

const sendContactMessageSchema = contactFormSchema.merge(turnstileTokenSchema)
const RESEND_EMAIL_API_URL = 'https://api.resend.com/emails'

function getRequiredContactEnv(name: 'CONTACT_ADMIN_EMAIL' | 'CONTACT_FROM_EMAIL' | 'RESEND_API_KEY') {
  return getRequiredServerEnv(name, `${name} is required to send contact messages.`)
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

async function sendResendEmail(values: ContactFormValues) {
  const apiKey = getRequiredContactEnv('RESEND_API_KEY')
  const from = getRequiredContactEnv('CONTACT_FROM_EMAIL')
  const to = getRequiredContactEnv('CONTACT_ADMIN_EMAIL')
  const html = await renderContactEmailHtml(values)

  const response = await fetch(RESEND_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: values.email,
      subject: buildContactEmailSubject(values.name),
      text: buildContactEmailText(values),
      html,
    }),
  })

  if (!response.ok) {
    throw new Error(`Resend request failed with status ${response.status}.`)
  }

  const payload = resendEmailResponseSchema.safeParse(await response.json().catch(() => ({})))
  return payload.success ? payload.data.id : undefined
}

export const sendContactMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => sendContactMessageSchema.parse(data))
  .handler(async ({ data }): Promise<TurnstileAwareActionResponse> => {
    const turnstile = await verifyTurnstileToken({
      action: 'contact',
      skipVerification: isTurnstileVerificationBypassed(),
      token: data.turnstileToken,
    })

    if (!turnstile.success) {
      return createTurnstileErrorResponse(
        turnstile.message,
        turnstile.code ?? TURNSTILE_ERROR_CODES.failed,
      )
    }

    try {
      await sendResendEmail(data)

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
  })
