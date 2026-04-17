import type { ZodType } from 'zod'

const SENTENCE_ENDING_REGEX = /[.!?]$/

const ensureSentence = (message: string) => {
  const trimmed = message.trim()

  if (trimmed.length === 0) {
    return 'Invalid input.'
  }

  return SENTENCE_ENDING_REGEX.test(trimmed) ? trimmed : `${trimmed}.`
}

export function parseValidatedInput<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)

  if (result.success) {
    return result.data
  }

  throw new Error(result.error.issues.map(issue => ensureSentence(issue.message)).join('\n'))
}
