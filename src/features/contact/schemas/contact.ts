import { z } from 'zod'

const CONTACT_FORM_LIMITS = {
  nameMaxLength: 80,
  emailMaxLength: 254,
  messageMinLength: 20,
  messageMaxLength: 4000,
} as const

const angleBracketRegex = /[<>]/
const messageTextRegex = /^[^<>]*$/

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127)
  })
}

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(CONTACT_FORM_LIMITS.nameMaxLength, 'Name must be less than 80 characters').refine(name => !hasControlCharacter(name), 'Name cannot contain control characters.').refine(name => !angleBracketRegex.test(name), 'Name cannot contain angle brackets.'),
  email: z.string().trim().email('Please enter a valid email address').max(CONTACT_FORM_LIMITS.emailMaxLength, 'Email must be less than 254 characters'),
  message: z.string().trim().min(CONTACT_FORM_LIMITS.messageMinLength, 'Message must be at least 20 characters').max(CONTACT_FORM_LIMITS.messageMaxLength, 'Message must be less than 4000 characters').refine(
    message => messageTextRegex.test(message),
    'Message cannot contain angle brackets.',
  ),
})

export type ContactFormValues = z.infer<typeof contactFormSchema>
