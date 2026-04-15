import { z } from 'zod'

const TASK_DESCRIPTION_MIN_WORDS = 5
const TASK_DESCRIPTION_MAX_WORDS = 150

const WORD_REGEX = /\S+/g

function countWords(value: string) {
  return value.trim().match(WORD_REGEX)?.length ?? 0
}

export const taskSchema = z.object({
  groupId: z
    .string()
    .uuid('Invalid Group ID'),
  description: z
    .string()
    .trim()
    .min(1, 'Task description is required')
    .refine(
      value => countWords(value) >= TASK_DESCRIPTION_MIN_WORDS,
      `Task description must be at least ${TASK_DESCRIPTION_MIN_WORDS} words`,
    )
    .refine(
      value => countWords(value) <= TASK_DESCRIPTION_MAX_WORDS,
      `Task description must be at most ${TASK_DESCRIPTION_MAX_WORDS} words`,
    ),
})

export type TaskValues = z.infer<typeof taskSchema>
