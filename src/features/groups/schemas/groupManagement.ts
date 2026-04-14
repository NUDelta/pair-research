import { z } from 'zod'

const groupNameRegex = /^[\p{L}\p{N}_\- ]+$/u
const groupDescriptionRegex = /^[^<>]*$/
const roleTitleRegex = /^[\p{L}\p{N}_\- ]+$/u

const groupIdSchema = z.string().uuid('Group ID must be a valid UUID')
const userIdSchema = z.string().uuid('User ID must be a valid UUID')
const roleIdSchema = z.string().regex(/^\d+$/, 'Role ID must be a valid numeric identifier')
const emailSchema = z.string().trim().min(1, 'Email is required').email('Please enter a valid email address').refine(
  email => !email.endsWith('@disposable.com'),
  'Disposable email addresses are not allowed',
)

const groupNameSchema = z.string().trim().min(2, 'Group name is required').max(50, 'Group name must be less than 50 characters').regex(
  groupNameRegex,
  'Group name can only contain letters, numbers, underscores, hyphens, and spaces',
)

const groupDescriptionSchema = z.string().trim().max(500, 'Group description must be less than 500 characters').refine(
  description => description.length === 0 || (description.length >= 5 && groupDescriptionRegex.test(description)),
  'Group description must be 5–500 characters and contain valid characters',
)
const roleTitleSchema = z.string().trim().min(2, 'Role title is required').max(50, 'Role title must be less than 50 characters').regex(
  roleTitleRegex,
  'Role title can only contain letters, numbers, underscores, hyphens, and spaces',
)

export const groupSettingsParamsSchema = z.object({
  groupId: groupIdSchema,
})

export const updateGroupBasicsSchema = z.object({
  groupId: groupIdSchema,
  groupName: groupNameSchema,
  groupDescription: groupDescriptionSchema,
})

export const addGroupMemberSchema = z.object({
  groupId: groupIdSchema,
  email: emailSchema,
  roleId: roleIdSchema,
  isAdmin: z.boolean(),
})

export const updateGroupMemberSchema = z.object({
  groupId: groupIdSchema,
  userId: userIdSchema,
  roleId: roleIdSchema,
  isAdmin: z.boolean(),
})

export const bulkUpdateGroupMemberRolesSchema = z.object({
  groupId: groupIdSchema,
  userIds: z.array(userIdSchema).min(1, 'Select at least one member').max(100, 'Select at most 100 members at a time'),
  roleId: roleIdSchema,
})

export const createGroupRoleSchema = z.object({
  groupId: groupIdSchema,
  title: roleTitleSchema,
})

export const updateGroupRoleSchema = z.object({
  groupId: groupIdSchema,
  roleId: roleIdSchema,
  title: roleTitleSchema,
})

export const deleteGroupRoleSchema = z.object({
  groupId: groupIdSchema,
  roleId: roleIdSchema,
  replacementRoleId: roleIdSchema.optional(),
})

export const removeGroupMemberSchema = z.object({
  groupId: groupIdSchema,
  userId: userIdSchema,
})

export type UpdateGroupBasicsValues = z.infer<typeof updateGroupBasicsSchema>
export type AddGroupMemberValues = z.infer<typeof addGroupMemberSchema>
