import type { OddHandlingResult } from './types'

export function handleOddUsers(
  preferences: number[][],
  options: { method: 'add' | 'remove', personToRemove?: number },
): OddHandlingResult {
  if (options.method === 'add') {
    const addedPersonIndex = preferences.length
    const expandedPreferences = preferences.map(row => [...row, addedPersonIndex])

    expandedPreferences.push(preferences.map((_, personIndex) => personIndex))

    return {
      preferences: expandedPreferences,
      removedPerson: null,
      addedPerson: true,
    }
  }

  const removedPerson = options.personToRemove

  if (removedPerson === undefined) {
    throw new Error('personToRemove is required when odd handling removes a participant')
  }

  const reducedPreferences = preferences
    .filter((_, personIndex) => personIndex !== removedPerson)
    .map(row =>
      row
        .filter(candidateIndex => candidateIndex !== removedPerson)
        .map(candidateIndex => (candidateIndex > removedPerson ? candidateIndex - 1 : candidateIndex)),
    )

  return {
    preferences: reducedPreferences,
    removedPerson,
    addedPerson: false,
  }
}

export function undoOddHandling(
  matching: number[],
  removedPerson: number | null,
  addedPerson: boolean,
): number[] {
  if (addedPerson) {
    const addedPersonIndex = matching.length - 1
    const partner = matching[addedPersonIndex]
    const restoredMatching = matching.slice(0, -1)

    if (partner >= 0) {
      restoredMatching[partner] = -1
    }

    return restoredMatching
  }

  if (removedPerson === null) {
    return matching
  }

  const restoredMatching: number[] = Array.from<number>(
    { length: matching.length + 1 } as ArrayLike<number>,
  ).fill(-1)

  for (const [reducedIndex, partner] of matching.entries()) {
    const originalIndex = reducedIndex >= removedPerson ? reducedIndex + 1 : reducedIndex

    restoredMatching[originalIndex] = partner === -1
      ? -1
      : partner >= removedPerson
        ? partner + 1
        : partner
  }

  restoredMatching[removedPerson] = -1

  return restoredMatching
}
