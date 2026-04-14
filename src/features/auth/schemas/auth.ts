import { z } from 'zod'

const passwordRegex = /^(?=.*[a-z])(?=.*\d)/i

export const passwordSchema = z
  .string()
  .nonempty('Password is required')
  .min(8, 'Password must be at least 8 characters')
  .regex(passwordRegex, 'Password must contain at least one letter and one number')

export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .refine(
      email => !email.endsWith('@disposable.com'),
      'Disposable email addresses are not allowed',
    ),
  password: passwordSchema,
})

export const nameSchema = z.object({
  name: z
    .string()
    .nonempty('Name is required')
    .min(2, 'Name is required')
    .max(50, 'Name must be less than 50 characters'),
})

export const signupSchema = loginSchema.extend(nameSchema.shape)
export const signupFormSchema = signupSchema
  .extend({
    confirmPassword: passwordSchema,
  })
  .refine(data => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const resetPasswordFormSchema = z.object({
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine(data => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
})

export type PasswordValues = z.infer<typeof passwordSchema>
export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
export type SignupFormValues = z.infer<typeof signupFormSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>
