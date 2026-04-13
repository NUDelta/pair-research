import { z } from 'zod'

// Group name: alphanumeric, underscores, hyphens, and spaces
const groupNameRegex = /^[\p{L}\p{N}_\- ]+$/u
// Group description: any character, including newlines
const groupDescriptionRegex = /^[^<>]*$/
// Role title: alphanumeric, underscores, hyphens, and spaces
const roleTitleRegex = /^[\p{L}\p{N}_\- ]+$/u

export const roleSchema = z.object({
  title: z
    .string()
    .nonempty('Role title is required')
    .min(2, 'Role title must be at least 2 characters')
    .max(50, 'Role title must be less than 50 characters')
    .regex(roleTitleRegex, 'Role title can only contain letters, numbers, underscores, hyphens, and spaces'),
})

export const emailSchema = z.object({
  email: z
    .string()
    .nonempty('Email is required')
    .email('Please enter a valid email address')
    .refine(
      email => !email.endsWith('@disposable.com'),
      'Disposable email addresses are not allowed',
    ),
})

export const memberSchema = emailSchema.extend(roleSchema.shape)

export const groupSchema = z.object({
  groupName: z
    .string()
    .nonempty('Group name is required')
    .min(2, 'Group name is required')
    .max(50, 'Group name must be less than 50 characters')
    .regex(groupNameRegex, 'Group name can only contain letters, numbers, underscores, hyphens, and spaces'),
  groupDescription: z
    .string()
    .optional()
    .refine(
      val =>
        val === undefined
        || val === null
        || val.trim() === ''
        || (val.length >= 5
          && val.length <= 500
          && groupDescriptionRegex.test(val)),
      {
        message: 'Group description must be 5–500 characters and contain valid characters',
      },
    ),
  roles: z
    .array(roleSchema)
    .min(1, 'At least one role is required')
    .max(8, 'You can have a maximum of 8 roles'),
  // Assigned role should be one of the roles defined above
  assignedRole: z.string().min(2).max(50, 'Assigned role is required'),
  members: z
    .array(memberSchema)
    .max(50, 'You can invite a maximum of 50 members'),
})

export type RoleValues = z.infer<typeof roleSchema>
export type EmailValues = z.infer<typeof emailSchema>
export type MemberValues = z.infer<typeof memberSchema>
export type GroupValues = z.infer<typeof groupSchema>
