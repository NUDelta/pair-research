/**
 * Converts directed affinity weights into ordered roommate preferences.
 */
export function createPreferenceMatrix(weightedMatrix: number[][]): number[][] {
  return weightedMatrix.map((row, personIndex) =>
    row
      .map((weight, candidateIndex) => ({ weight, candidateIndex }))
      .filter(({ candidateIndex }) => candidateIndex !== personIndex)
      .sort((left, right) => {
        const weightDifference = right.weight - left.weight
        if (weightDifference !== 0) {
          return weightDifference
        }

        return left.candidateIndex - right.candidateIndex
      })
      .map(({ candidateIndex }) => candidateIndex),
  )
}

export function validatePreferenceMatrix(preferences: number[][]): number[][] | null {
  if (!Array.isArray(preferences) || preferences.length <= 1) {
    return null
  }

  const participantCount = preferences.length
  const completedPreferences = preferences.map(row => [...row])

  for (const [personIndex, row] of completedPreferences.entries()) {
    if (!Array.isArray(row) || row.length > participantCount - 1) {
      return null
    }

    const seen = new Set<number>()

    for (const preference of row) {
      if (!Number.isInteger(preference)) {
        return null
      }

      if (preference < 0 || preference >= participantCount || preference === personIndex || seen.has(preference)) {
        return null
      }

      seen.add(preference)
    }

    for (let candidateIndex = 0; candidateIndex < participantCount; candidateIndex += 1) {
      if (candidateIndex !== personIndex && !seen.has(candidateIndex)) {
        row.push(candidateIndex)
      }
    }
  }

  return completedPreferences
}

export function createRankMatrix(preferences: number[][]): number[][] {
  return preferences.map((row, personIndex) => {
    const ranks: number[] = Array.from<number>(
      { length: preferences.length } as ArrayLike<number>,
    ).fill(Number.POSITIVE_INFINITY)
    ranks[personIndex] = Number.POSITIVE_INFINITY

    row.forEach((candidateIndex, rank) => {
      ranks[candidateIndex] = rank
    })

    return ranks
  })
}

export function scoreMatchingByPreferences(preferences: number[][], matching: number[]): number {
  return matching.reduce((score, partner, personIndex) => {
    if (partner === -1) {
      return score
    }

    const preferenceIndex = preferences[personIndex].indexOf(partner)

    if (preferenceIndex === -1) {
      return score
    }

    return score + (preferences.length - preferenceIndex)
  }, 0)
}
