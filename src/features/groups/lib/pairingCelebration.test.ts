import { describe, expect, it } from 'vitest'
import { shouldCelebratePairingActivation } from './pairingCelebration'

describe('shouldCelebratePairingActivation', () => {
  it('celebrates when a new pairing becomes active', () => {
    expect(shouldCelebratePairingActivation(null, 'pairing-1')).toBe(true)
  })

  it('does not replay for the same pairing id', () => {
    expect(shouldCelebratePairingActivation('pairing-1', 'pairing-1')).toBe(false)
  })

  it('does not celebrate when there is still no active pairing', () => {
    expect(shouldCelebratePairingActivation(null, null)).toBe(false)
  })

  it('celebrates again when a later pairing id replaces the previous round', () => {
    expect(shouldCelebratePairingActivation('pairing-1', 'pairing-2')).toBe(true)
  })
})
