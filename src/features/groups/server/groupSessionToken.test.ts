import { describe, expect, it } from 'vitest'
import {
  createGroupSessionTokenValue,
  validateGroupSessionSigningSecret,
  verifyGroupSessionTokenValue,
} from './groupSessionToken'

const signingSecret = 'group-session-signing-secret-32-bytes-minimum'
const otherSigningSecret = 'different-group-session-secret-32-bytes'

describe('group session token helpers', () => {
  it('verifies a valid group session token', async () => {
    const token = await createGroupSessionTokenValue({
      groupId: 'group-1',
      userId: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 60,
    }, signingSecret)

    await expect(verifyGroupSessionTokenValue(token, signingSecret, 'group-1')).resolves.toEqual({
      groupId: 'group-1',
      userId: 'user-1',
      exp: expect.any(Number),
    })
  })

  it('rejects malformed tokens without throwing', async () => {
    await expect(
      verifyGroupSessionTokenValue('not-base64.not-base64', signingSecret, 'group-1'),
    ).resolves.toBeNull()
    await expect(
      verifyGroupSessionTokenValue('too.many.parts.here', signingSecret, 'group-1'),
    ).resolves.toBeNull()
  })

  it('rejects tokens scoped to another group', async () => {
    const token = await createGroupSessionTokenValue({
      groupId: 'group-1',
      userId: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 60,
    }, signingSecret)

    await expect(verifyGroupSessionTokenValue(token, signingSecret, 'group-2')).resolves.toBeNull()
  })

  it('rejects a Supabase service key or any other signing key', async () => {
    const token = await createGroupSessionTokenValue({
      groupId: 'group-1',
      userId: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 60,
    }, signingSecret)

    await expect(
      verifyGroupSessionTokenValue(token, otherSigningSecret, 'group-1'),
    ).resolves.toBeNull()
  })

  it('rejects expired tokens', async () => {
    const token = await createGroupSessionTokenValue({
      groupId: 'group-1',
      userId: 'user-1',
      exp: Math.floor(Date.now() / 1000) - 1,
    }, signingSecret)

    await expect(
      verifyGroupSessionTokenValue(token, signingSecret, 'group-1'),
    ).resolves.toBeNull()
  })

  it('rejects weak configuration secrets', () => {
    expect(() => validateGroupSessionSigningSecret('too-short')).toThrow('at least 32 bytes')
    expect(validateGroupSessionSigningSecret(signingSecret)).toBe(signingSecret)
  })
})
