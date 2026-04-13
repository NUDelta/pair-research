import { z } from 'zod'
import { userSchema } from '@/features/groups/schemas/user'

export const groupSchema = z.object({
  id: z.string().describe('Group ID'),
  groupName: z.string().describe('Group Name'),
  groupDescription: z.string().nullable().describe('Group Description'),
  role: z.string().describe('The given user\s role in this group'),
  isAdmin: z.boolean().describe('Is the user an admin of this group'),
  isPending: z.boolean().describe('Is the user pending in this group'),
  joinedAt: z.string().describe('Joined this group at'),
})

export const groupAdminSchema = groupSchema.extend({
  createdAt: z.string().describe('Group Created At'),
  groupMembers: z.array(
    userSchema.extend({
      role: z.string().describe('The given user\s role in this group'),
      isAdmin: z.boolean().describe('Is the user an admin of this group'),
      isPending: z.boolean().describe('Is the user pending in this group'),
      joinedAt: z.string().describe('Joined this group at'),
    }),
  ).describe('Group Members'),
})

// Union: admin groups must be checked first so admin-only fields are preserved.
export const groupUnionSchema = z.union([groupAdminSchema, groupSchema])

// Entire response: list of mixed or consistent groups
export const groupsResponseSchema = z.array(groupUnionSchema)

export type Group = z.infer<typeof groupUnionSchema>
