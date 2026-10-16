import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GROUP_SESSION_WEBSOCKET_PROTOCOL } from '@/features/groups/lib/groupSessionProtocol'
import { subscribeToGroupTaskChanges } from './subscribeToGroupTaskChanges'

class WebSocketMock {
  static instances: WebSocketMock[] = []

  close = vi.fn()

  constructor(
    public readonly url: string,
    public readonly protocols?: string | string[],
  ) {
    WebSocketMock.instances.push(this)
  }

  private listeners = new Map<string, (event: { data?: string, code?: number }) => void>()
  addEventListener = vi.fn((type: string, handler: (event: { data?: string, code?: number }) => void) => {
    this.listeners.set(type, handler)
  })

  emit(type: string, event: { data?: string, code?: number } = {}) {
    this.listeners.get(type)?.(event)
  }
}

describe('subscribeToGroupTaskChanges', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    WebSocketMock.instances = []
    vi.stubGlobal('WebSocket', WebSocketMock)
    vi.spyOn(Math, 'random').mockReturnValue(1)
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
    expect(WebSocketMock.instances[0].url).toContain('/api/group-sessions/group-1/realtime')
    expect(WebSocketMock.instances[0].url).not.toContain('token-1')
    expect(WebSocketMock.instances[0].protocols).toEqual([GROUP_SESSION_WEBSOCKET_PROTOCOL, 'token-1'])

    unsubscribe()
  })
  it('backs off consecutive failures and resets after a server snapshot', async () => {
    const getToken = vi.fn().mockResolvedValue('token')
    const unsubscribe = subscribeToGroupTaskChanges('backoff', getToken, vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    WebSocketMock.instances[0].emit('close', { code: 1006 })
    await vi.advanceTimersByTimeAsync(749)
    expect(getToken).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    WebSocketMock.instances[1].emit('close', { code: 1006 })
    await vi.advanceTimersByTimeAsync(1499)
    expect(getToken).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    WebSocketMock.instances[2].emit('message', { data: JSON.stringify({ type: 'snapshot', tasks: [] }) })
    WebSocketMock.instances[2].emit('close', { code: 1006 })
    await vi.advanceTimersByTimeAsync(750)
    expect(getToken).toHaveBeenCalledTimes(4)
    unsubscribe()
  })

  it('pauses offline and connects once when connectivity returns', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const getToken = vi.fn().mockResolvedValue('token')
    const unsubscribe = subscribeToGroupTaskChanges('offline', getToken, vi.fn())
    await vi.advanceTimersByTimeAsync(60_000)
    expect(getToken).not.toHaveBeenCalled()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(getToken).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('stops retrying revoked membership and removes timers on unsubscribe', async () => {
    const getToken = vi.fn().mockResolvedValue('token')
    const unsubscribe = subscribeToGroupTaskChanges('revoked', getToken, vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    WebSocketMock.instances[0].emit('close', { code: 1008 })
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(getToken).toHaveBeenCalledTimes(1)
    unsubscribe()

    const dispose = subscribeToGroupTaskChanges('disposed', getToken, vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    WebSocketMock.instances[1].emit('close', { code: 1006 })
    dispose()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(getToken).toHaveBeenCalledTimes(2)
  })

  it('does not connect after an unsubscribed token request resolves', async () => {
    let resolve: (value: string) => void = () => {}
    const getToken = vi.fn(async () => new Promise<string>((done) => {
      resolve = done
    }))
    const unsubscribe = subscribeToGroupTaskChanges('pending', getToken, vi.fn())
    unsubscribe()
    resolve('token')
    await vi.advanceTimersByTimeAsync(0)
    expect(WebSocketMock.instances).toHaveLength(0)
  })
})
