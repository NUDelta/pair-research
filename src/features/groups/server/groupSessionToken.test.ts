import { describe, expect, it } from 'vitest'
import {
  createGroupSessionTokenValue,
  verifyGroupSessionTokenValue,
} from './groupSessionToken'

describe('group session token helpers', () => {
  it('verifies a valid group session token', async () => {
    const token = await createGroupSessionTokenValue({
      groupId: 'group-1',
      userId: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 60,
    }, 'secret')

    await expect(verifyGroupSessionTokenValue(token, 'secret', 'group-1')).resolves.toEqual({
      groupId: 'group-1',
      userId: 'user-1',
      exp: expect.any(Number),
    })
  })

  it('rejects malformed tokens without throwing', async () => {
    await expect(
      verifyGroupSessionTokenValue('not-base64.not-base64', 'secret', 'group-1'),
    ).resolves.toBeNull()
    await expect(
      verifyGroupSessionTokenValue('too.many.parts.here', 'secret', 'group-1'),
    ).resolves.toBeNull()
  })

  it('rejects tokens scoped to another group', async () => {
    const token = await createGroupSessionTokenValue({
      groupId: 'group-1',
      userId: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 60,
    }, 'secret')

    await expect(verifyGroupSessionTokenValue(token, 'secret', 'group-2')).resolves.toBeNull()
  })
})
