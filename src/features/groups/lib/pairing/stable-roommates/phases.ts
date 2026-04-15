/**
 * Phase 1 is the proposal round. Each participant keeps their best proposal
 * so far while rejected participants continue down their list.
 */
export function phase1(
  preferences: number[][],
  ranks: number[][],
  initialChoiceIndexes?: number[],
): Array<number | null> {
  const holds: Array<number | null> = Array.from<number | null>(
    { length: preferences.length } as ArrayLike<number | null>,
  ).fill(null)
  const choiceIndexes: number[] = initialChoiceIndexes
    ? [...initialChoiceIndexes]
    : Array.from<number>(
        { length: preferences.length } as ArrayLike<number>,
      ).fill(0)
  const proposedPeople = new Set<number>()

  for (let personIndex = 0; personIndex < preferences.length; personIndex += 1) {
    let proposer = personIndex

    while (true) {
      let proposee: number | null = null
      let previousHold: number | null = null

      while (choiceIndexes[proposer] < preferences[proposer].length) {
        const candidatePosition = choiceIndexes[proposer]
        const candidateIndex = preferences[proposer][candidatePosition]

        if (candidateIndex === undefined) {
          break
        }

        choiceIndexes[proposer] = candidatePosition + 1

        const currentHold = holds[candidateIndex]

        if (currentHold === null || ranks[candidateIndex][proposer] < ranks[candidateIndex][currentHold]) {
          holds[candidateIndex] = proposer
          proposee = candidateIndex
          previousHold = currentHold
          break
        }
      }

      if (proposee === null) {
        break
      }

      if (!proposedPeople.has(proposee)) {
        proposedPeople.add(proposee)
        break
      }

      if (previousHold === null) {
        break
      }

      proposer = previousHold
    }
  }

  return holds
}

export function phase1Reduce(
  preferences: number[][],
  ranks: number[][],
  holds: number[],
): number[][] {
  const reducedPreferences = preferences.map(row => [...row])

  for (let proposee = 0; proposee < holds.length; proposee += 1) {
    const proposer = holds[proposee]

    let index = 0
    while (index < reducedPreferences[proposee].length) {
      const preferredPerson = reducedPreferences[proposee][index]

      if (preferredPerson === proposer) {
        reducedPreferences[proposee] = reducedPreferences[proposee].slice(0, index + 1)
      }
      else if (
        holds[preferredPerson] !== undefined
        && ranks[preferredPerson][holds[preferredPerson]] < ranks[preferredPerson][proposee]
      ) {
        reducedPreferences[proposee].splice(index, 1)
        continue
      }

      index += 1
    }
  }

  return reducedPreferences
}

export function findAllOrNothingCycle(preferences: number[][]): number[] | null {
  const p: number[] = []
  const q: number[] = []
  let current = preferences.findIndex(row => row.length > 1)

  if (current === -1) {
    return null
  }

  while (!p.includes(current)) {
    q.push(preferences[current][1])
    p.push(current)
    current = preferences[q[q.length - 1]].at(-1) ?? -1
  }

  return p.slice(p.indexOf(current))
}

/**
 * Phase 2 repeatedly forces the discovered cycle to advance by one choice until
 * all-or-nothing cycles disappear or the instance collapses.
 */
export function phase2Reduce(
  preferences: number[][],
  ranks: number[][],
  cycle: number[],
): number[] | null {
  let currentCycle: number[] | null = [...cycle]
  let currentHolds: Array<number | null> | null = null
  let reducedPreferences = preferences.map(row => [...row])

  while (currentCycle !== null) {
    const initialChoiceIndexes = reducedPreferences.map((_, personIndex) =>
      currentCycle?.includes(personIndex) ? 1 : 0,
    )

    currentHolds = phase1(reducedPreferences, ranks, initialChoiceIndexes)

    if (currentHolds.includes(null)) {
      return null
    }

    reducedPreferences = phase1Reduce(reducedPreferences, ranks, currentHolds as number[])
    currentCycle = findAllOrNothingCycle(reducedPreferences)
  }

  return currentHolds as number[] | null
}
