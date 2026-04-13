import { z } from 'zod'

export const userSchema = z.object({
  id: z.string().describe('User ID - UUID'),
  fullName: z.string().nullable().describe('User Name'),
  avatarUrl: z.string().nullable().describe('User Avatar URL'),
  email: z.string().email().describe('User Email'),
})
