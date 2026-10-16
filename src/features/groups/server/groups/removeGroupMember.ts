import { createServerFn } from '@tanstack/react-start'
import { removeGroupMemberSchema } from '@/features/groups/schemas/groupManagement'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'

export const removeGroupMember = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(removeGroupMemberSchema, data))
  .handler(async ({ data }) => {
    const { performMemberRemoval } = await import('./removeGroupMember.server')
    return performMemberRemoval(data)
  })
