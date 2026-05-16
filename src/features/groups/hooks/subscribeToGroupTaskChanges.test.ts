import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribeToGroupTaskChanges } from './subscribeToGroupTaskChanges'

class WebSocketMock {
  static instances: WebSocketMock[] = []

  close = vi.fn()

  constructor(public readonly url: string) {
    WebSocketMock.instances.push(this)
  }

  addEventListener = vi.fn()
}

describe('subscribeToGroupTaskChanges', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    WebSocketMock.instances = []
    vi.stubGlobal('WebSocket', WebSocketMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('retries when the group session token cannot be loaded', async () => {
    const getToken = vi.fn()
      .mockRejectedValueOnce(new Error('token failed'))
      .mockResolvedValueOnce('token-1')

    const unsubscribe = subscribeToGroupTaskChanges('group-1', getToken, vi.fn())

    await vi.runOnlyPendingTimersAsync()

    expect(getToken).toHaveBeenCalledTimes(2)
    expect(WebSocketMock.instances).toHaveLength(1)
    expect(WebSocketMock.instances[0].url).toContain('/api/group-sessions/group-1/realtime?token=token-1')

    unsubscribe()
  })
})
