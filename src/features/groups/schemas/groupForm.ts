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
    .trim()
    .nonempty('Role title is required')
    .min(2, 'Use at least one short word for the role title')
    .max(50, 'Keep the role title to a few words')
    .regex(roleTitleRegex, 'Use letters, numbers, spaces, hyphens, or underscores for the role title'),
})

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
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
    .trim()
    .nonempty('Group name is required')
    .min(2, 'Group name is required')
    .max(50, 'Keep the group name to a few clear words')
    .regex(groupNameRegex, 'Use letters, numbers, spaces, hyphens, or underscores for the group name'),
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
        message: 'Write a short plain-text description and avoid angle brackets like < or >',
      },
    ),
  roles: z
    .array(roleSchema)
    .min(1, 'At least one role is required')
    .max(8, 'You can have a maximum of 8 roles')
    .superRefine((roles, context) => {
      const seenTitles = new Set<string>()

      roles.forEach((role, index) => {
        const normalizedTitle = role.title.trim().toLowerCase()
        if (seenTitles.has(normalizedTitle)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'title'],
            message: 'Each role title must be unique.',
          })
          return
        }

        seenTitles.add(normalizedTitle)
      })
    }),
  // Assigned role should be one of the roles defined above
  assignedRole: z.string().trim().min(2).max(50, 'Assigned role is required'),
  members: z
    .array(memberSchema)
    .max(50, 'You can invite a maximum of 50 members'),
})

export type RoleValues = z.infer<typeof roleSchema>
export type EmailValues = z.infer<typeof emailSchema>
export type MemberValues = z.infer<typeof memberSchema>
export type GroupValues = z.infer<typeof groupSchema>
