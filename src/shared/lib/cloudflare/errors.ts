/**
 * Error thrown when an expected Cloudflare binding is missing at runtime.
 */
export class MissingBindingError extends Error {
  constructor(bindingName: string) {
    super(`Required Cloudflare binding "${bindingName}" is not configured`)
    this.name = 'MissingBindingError'
  }
}

/**
 * Asserts that a binding is present and narrows the type for callers.
 *
 * @param value Binding value from the runtime env.
 * @param bindingName Binding name used in error messages.
 * @returns The same value when it exists.
 * @throws {MissingBindingError} When the binding is undefined or null.
 */
export function assertBinding<T>(value: T | undefined | null, bindingName: string): T {
  if (value === undefined || value === null) {
    throw new MissingBindingError(bindingName)
  }
  return value
}

/**
 * Normalizes unknown exceptions into display-safe strings.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
