import { describe, expect, it } from 'vitest'
import { contactFormSchema } from './contact'

const validContactMessage = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Please help me investigate a production contact issue.',
}

describe('contactFormSchema', () => {
  it('accepts a trimmed valid contact message', () => {
    const result = contactFormSchema.parse({
      name: ' Ada Lovelace ',
      email: ' ada@example.com ',
      message: ' Please help me investigate a production contact issue. ',
    })

    expect(result).toEqual(validContactMessage)
  })

  it('rejects name control characters and angle brackets', () => {
    expect(contactFormSchema.safeParse({ ...validContactMessage, name: 'Ada\nLovelace' }).success).toBe(false)
    expect(contactFormSchema.safeParse({ ...validContactMessage, name: '<Ada>' }).success).toBe(false)
  })

  it('enforces email and message bounds', () => {
    expect(contactFormSchema.safeParse({ ...validContactMessage, email: `${'a'.repeat(245)}@example.com` }).success).toBe(false)
    expect(contactFormSchema.safeParse({ ...validContactMessage, message: 'Too short' }).success).toBe(false)
    expect(contactFormSchema.safeParse({ ...validContactMessage, message: '<script>alert(1)</script> with enough text' }).success).toBe(false)
  })
})
