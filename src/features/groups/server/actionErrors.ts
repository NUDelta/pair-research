export class UserSafeActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserSafeActionError'
  }
}

/**
 * Marks an action failure message as safe to show in client toasts and forms.
 */
export function createUserSafeActionError(message: string) {
  return new UserSafeActionError(message)
}

/**
 * Returns only explicitly marked action messages to clients.
 */
export function getActionErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof UserSafeActionError && error.message.trim().length > 0) {
    return error.message
  }

  return fallbackMessage
}
