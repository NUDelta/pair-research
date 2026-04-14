import { describe, expect, it } from 'vitest'
import { signupFormSchema, signupSchema } from './auth'

describe('signupSchema', () => {
  it('accepts the server signup payload without confirmPassword', () => {
    expect(signupSchema.parse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
    })).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
    })
  })
})

describe('signupFormSchema', () => {
  it('accepts matching passwords', () => {
    expect(signupFormSchema.parse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
      confirmPassword: 'password1',
    })).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
      confirmPassword: 'password1',
    })
  })

  it('rejects mismatched passwords with a confirmPassword error', () => {
    const result = signupFormSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
      confirmPassword: 'password2',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain('Passwords do not match')
    }
  })
})
