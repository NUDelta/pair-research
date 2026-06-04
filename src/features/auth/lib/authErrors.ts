export function isMissingSupabaseSessionError(error: { name?: string | null, message?: string | null } | null | undefined) {
  return error?.name === 'AuthSessionMissingError'
    || error?.message === 'Auth session missing!'
}
