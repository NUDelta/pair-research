import type { ContactFormValues } from '@/features/contact/schemas/contact'
import { z } from 'zod'
import { getRequiredServerEnv } from '@/shared/server/env.server'
import { buildResendEmailPayload, renderContactEmailHtml } from './sendContactMessage'

const resendEmailResponseSchema = z.object({
  id: z.string().optional(),
})

const RESEND_EMAIL_API_URL = 'https://api.resend.com/emails'

function getRequiredContactEnv(name: 'CONTACT_ADMIN_EMAIL' | 'CONTACT_FROM_EMAIL' | 'RESEND_API_KEY') {
  return getRequiredServerEnv(name, `${name} is required to send contact messages.`)
}

export async function sendResendEmail(values: ContactFormValues) {
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
    body: JSON.stringify(buildResendEmailPayload({
      from,
      html,
      to,
      values,
    })),
  })

  if (!response.ok) {
    throw new Error(`Resend request failed with status ${response.status}.`)
  }

  const payload = resendEmailResponseSchema.safeParse(await response.json().catch(() => ({})))
  return payload.success ? payload.data.id : undefined
}
