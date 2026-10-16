// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendResendEmail } from './sendResendEmail.server'

vi.mock('@/shared/server/env.server', () => ({ getRequiredServerEnv: (name: string) => name }))
vi.mock('./sendContactMessage', () => ({
  renderContactEmailHtml: async () => '<p>Contact</p>',
  buildResendEmailPayload: () => ({ subject: 'Contact' }),
}))

describe('sendResendEmail', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('aborts a stalled email request instead of leaving the mutation pending', async () => {
    const controller = new AbortController()
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
    let requestStarted!: () => void
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve
    })
    vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'TimeoutError')))
      requestStarted()
    })))
    const response = sendResendEmail({ name: 'Ada', email: 'ada@example.com', message: 'Contact support' })
    await started
    controller.abort()
    await expect(response).rejects.toThrow('Timed out')
  })
})
