import { z } from 'zod'
import { userSchema } from '@/features/groups/schemas/user'

export const groupPermissionSchema = z.enum(['owner', 'admin', 'member'])

export const groupSchema = z.object({
  id: z.string().describe('Group ID'),
  groupName: z.string().describe('Group Name'),
  groupDescription: z.string().nullable().describe('Group Description'),
  role: z.string().describe('The given user\s role in this group'),
  permission: groupPermissionSchema.describe('The given user\s access level in this group'),
  isPending: z.boolean().describe('Is the user pending in this group'),
  joinedAt: z.string().describe('Joined this group at'),
})

export const groupManagerSchema = groupSchema.extend({
  createdAt: z.string().describe('Group Created At'),
  groupMembers: z.array(
    userSchema.extend({
      role: z.string().describe('The given user\s role in this group'),
      permission: groupPermissionSchema.describe('The given user\s access level in this group'),
      isPending: z.boolean().describe('Is the user pending in this group'),
      joinedAt: z.string().describe('Joined this group at'),
    }),
  ).describe('Group Members'),
})

// Union: manager groups must be checked first so manager-only fields are preserved.
export const groupUnionSchema = z.union([groupManagerSchema, groupSchema])

// Entire response: list of mixed or consistent groups
export const groupsResponseSchema = z.array(groupUnionSchema)

export type Group = z.infer<typeof groupUnionSchema>
