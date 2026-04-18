import { describe, expect, it, vi } from 'vitest'
import {
  getGroupInvitationAcceptanceErrorMessage,
  runGroupInvitationAcceptance,
} from './groupInvitationAcceptance'

describe('runGroupInvitationAcceptance', () => {
  it('calls the success handler when the server response succeeds', async () => {
    const onFailed = vi.fn()
    const onSettled = vi.fn()
    const onSucceeded = vi.fn()

    await runGroupInvitationAcceptance({
      acceptInvitation: vi.fn().mockResolvedValue({
        success: true,
        message: 'Accepted.',
      }),
      onFailed,
      onSettled,
      onSucceeded,
    })

    expect(onSucceeded).toHaveBeenCalledWith('Accepted.')
    expect(onFailed).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalledTimes(1)
  })

  it('calls the failure handler when the server response fails', async () => {
    const onFailed = vi.fn()
    const onSettled = vi.fn()
    const onSucceeded = vi.fn()

    await runGroupInvitationAcceptance({
      acceptInvitation: vi.fn().mockResolvedValue({
        success: false,
        message: 'Invite already accepted.',
      }),
      onFailed,
      onSettled,
      onSucceeded,
    })

    expect(onFailed).toHaveBeenCalledWith('Invite already accepted.')
    expect(onSucceeded).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalledTimes(1)
  })

  it('converts thrown errors into failure messages and still settles', async () => {
    const onFailed = vi.fn()
    const onSettled = vi.fn()
    const onSucceeded = vi.fn()

    await runGroupInvitationAcceptance({
      acceptInvitation: vi.fn().mockRejectedValue(new Error('Network down')),
      onFailed,
      onSettled,
      onSucceeded,
    })

    expect(onFailed).toHaveBeenCalledWith('Network down')
    expect(onSucceeded).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalledTimes(1)
  })
})

describe('getGroupInvitationAcceptanceErrorMessage', () => {
  it('falls back when the thrown value has no usable message', () => {
    expect(getGroupInvitationAcceptanceErrorMessage('boom')).toBe('Failed to accept the invitation.')
    expect(getGroupInvitationAcceptanceErrorMessage({ message: '' }, 'Fallback.')).toBe('Fallback.')
  })
})
