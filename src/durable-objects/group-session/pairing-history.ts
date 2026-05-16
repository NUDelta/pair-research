import type { PairingHistory } from '@/features/groups/lib/pairing'

export function buildPairingHistory(
  pairingTasks: Array<{ userId: string }>,
  previousPairs: Array<{ first_user: string, second_user: string }>,
): PairingHistory | undefined {
  if (previousPairs.length === 0) {
    return undefined
  }

  const currentUserIds = new Set(pairingTasks.map(task => task.userId))
  const normalizedPreviousPairs = previousPairs
    .map(pair => [pair.first_user, pair.second_user] as const)
    .filter(([firstUserId, secondUserId]) => currentUserIds.has(firstUserId) && currentUserIds.has(secondUserId))
  const pairedUserIds = new Set(normalizedPreviousPairs.flatMap(([firstUserId, secondUserId]) => [firstUserId, secondUserId]))
  const unmatchedCandidates = pairingTasks
    .map(task => task.userId)
    .filter(userId => !pairedUserIds.has(userId))

  return {
    previousPairs: normalizedPreviousPairs,
    previousUnmatchedUserId: pairingTasks.length % 2 === 1 && unmatchedCandidates.length === 1
      ? unmatchedCandidates[0]
      : null,
  }
}
