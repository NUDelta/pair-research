import { z } from 'zod'

export const userSchema = z.object({
  id: z.string().describe('User ID - UUID'),
  fullName: z.string().describe('User Name'),
  avatarUrl: z.string().describe('User Avatar URL'),
  email: z.string().email().describe('User Email'),
})
