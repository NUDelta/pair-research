import { describe, expect, it } from 'vitest'
import { findMaximumWeightMatching } from './maximumWeightMatching'

describe('findMaximumWeightMatching', () => {
  it('prefers maximum cardinality over a heavier single edge', () => {
    expect(findMaximumWeightMatching([
      [0, 50, 3, 3],
      [50, 0, 3, 3],
      [3, 3, 0, 3],
      [3, 3, 3, 0],
    ])).toEqual({
      matching: [1, 0, 3, 2],
      pairCount: 2,
      totalWeight: 53,
    })
  })

  it('keeps one participant unmatched in an odd pool while maximizing the remaining weight', () => {
    expect(findMaximumWeightMatching([
      [0, 9, 1],
      [9, 0, 8],
      [1, 8, 0],
    ])).toEqual({
      matching: [1, 0, -1],
      pairCount: 1,
      totalWeight: 9,
    })
  })

  it('skips forbidden edges and avoids a specific unmatched participant when possible', () => {
    expect(findMaximumWeightMatching([
      [0, 9, 8],
      [9, 0, 1],
      [8, 1, 0],
    ], {
      avoidUnmatchedParticipantIndex: 0,
    })).toEqual({
      matching: [1, 0, -1],
      pairCount: 1,
      totalWeight: 9,
    })
  })

  it('returns no constrained solution when only the avoided participant could be unmatched', () => {
    expect(findMaximumWeightMatching([
      [0, null, null],
      [null, 0, 7],
      [null, 7, 0],
    ], {
      avoidUnmatchedParticipantIndex: 0,
    })).toEqual({
      matching: [-1, -1, -1],
      pairCount: 0,
      totalWeight: 0,
    })
  })

  it('matches exhaustive enumeration for deterministic sparse, dense, and negative-weight graphs', () => {
    const random = createRandom(20261016)
    for (let size = 2; size <= 9; size += 1) {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const graph = createGraph(size, () => random() < (attempt % 3 + 1) / 3
          ? Math.floor(random() * 41) - 20
          : null)
        const largeGraph = padGraph(graph, 17 + attempt % 4)
        for (const avoided of [null, 0, size - 1]) {
          const expected = enumerateMatching(graph, avoided)
          for (const input of [graph, largeGraph]) {
            const result = findMaximumWeightMatching(input, { avoidUnmatchedParticipantIndex: avoided })
            expectMatching(input, result)
            expect({ pairCount: result.pairCount, totalWeight: result.totalWeight }).toEqual(expected)
            if (avoided !== null && expected.pairCount > 0) {
              expect(result.matching[avoided]).not.toBe(-1)
            }
          }
        }
      }
    }
  })

  it('solves disconnected odd components independently without dropping isolated participants', () => {
    const random = createRandom(17)
    const componentSizes = [5, 5, 4, 3]
    const graph = createGraph(20, () => null)
    const expectedComponents: Array<{ pairCount: number, totalWeight: number }> = []
    let offset = 0
    for (const size of componentSizes) {
      const component = createGraph(size, () => Math.floor(random() * 31) - 15)
      for (let i = 0; i < size; i += 1) {
        for (let j = 0; j < size; j += 1) {
          graph[offset + i][offset + j] = component[i][j]
        }
      }
      expectedComponents.push(enumerateMatching(component, offset === 10 ? 2 : null))
      offset += size
    }
    const result = findMaximumWeightMatching(graph, { avoidUnmatchedParticipantIndex: 12 })
    expectMatching(graph, result)
    expect(result.matching.slice(17)).toEqual([-1, -1, -1])
    expect(result.pairCount).toBe(expectedComponents.reduce((total, component) => total + component.pairCount, 0))
    expect(result.totalWeight).toBe(expectedComponents.reduce((total, component) => total + component.totalWeight, 0))
  })

  it('prioritizes cardinality over large negative weights in the polynomial solver', () => {
    const graph = createGraph(18, (i, j) => i === 0 && j === 1 ? 1000 : -100)
    const result = findMaximumWeightMatching(graph)
    expectMatching(graph, result)
    expect(result.pairCount).toBe(9)
    expect(result.totalWeight).toBe(200)
  })

  it('keeps the avoided participant matched before maximizing the remaining weight', () => {
    const graph = padGraph([
      [0, -50, -40],
      [-50, 0, 100],
      [-40, 100, 0],
    ], 17)
    const result = findMaximumWeightMatching(graph, { avoidUnmatchedParticipantIndex: 0 })
    expectMatching(graph, result)
    expect(result.pairCount).toBe(1)
    expect(result.totalWeight).toBe(-40)
    expect(result.matching.slice(0, 3)).toEqual([2, -1, 0])
    expect(findMaximumWeightMatching(graph, { avoidUnmatchedParticipantIndex: 16 })).toEqual({
      matching: Array.from({ length: 17 }).fill(-1),
      pairCount: 0,
      totalWeight: 0,
    })
  })

  it.each([32, 64, 100])('solves a dense %i-participant pool with its known optimal matching', (size) => {
    const graph = createGraph(size, (i, j) => Math.floor(i / 2) === Math.floor(j / 2) ? 10 : 1)
    const result = findMaximumWeightMatching(graph)
    expectMatching(graph, result)
    expect(result.pairCount).toBe(size / 2)
    expect(result.totalWeight).toBe(size * 5)
  })
})

type Matrix = Array<Array<number | null>>

function createGraph(size: number, weight: (i: number, j: number) => number | null): Matrix {
  const graph = Array.from({ length: size }, () => Array.from<number | null>({ length: size }).fill(null))
  for (let i = 0; i < size; i += 1) {
    graph[i][i] = 0
    for (let j = i + 1; j < size; j += 1) {
      graph[i][j] = graph[j][i] = weight(i, j)
    }
  }
  return graph
}

function padGraph(graph: Matrix, size: number): Matrix {
  return createGraph(size, (i, j) => i < graph.length && j < graph.length ? graph[i][j] : null)
}

function createRandom(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
}

// Enumerate every legal matching directly, without either production solver.
function enumerateMatching(graph: Matrix, avoided: number | null): { pairCount: number, totalWeight: number } {
  let best = { pairCount: -1, totalWeight: Number.NEGATIVE_INFINITY }
  const enumerate = (remaining: number[], pairs: Array<[number, number]>) => {
    if (remaining.length === 0) {
      if (avoided !== null && !pairs.some(pair => pair.includes(avoided))) {
        return
      }
      const candidate = { pairCount: pairs.length, totalWeight: pairs.reduce((total, [i, j]) => total + (graph[i][j] ?? 0), 0) }
      if (candidate.pairCount > best.pairCount || (candidate.pairCount === best.pairCount && candidate.totalWeight > best.totalWeight)) {
        best = candidate
      }
      return
    }
    const [first, ...rest] = remaining
    enumerate(rest, pairs)
    for (const [index, partner] of rest.entries()) {
      if (graph[first][partner] !== null) {
        enumerate(rest.filter((_, candidateIndex) => index !== candidateIndex), [...pairs, [first, partner]])
      }
    }
  }
  enumerate(Array.from({ length: graph.length }, (_, index) => index), [])
  return best.pairCount < 0 ? { pairCount: 0, totalWeight: 0 } : best
}

function expectMatching(graph: Matrix, result: ReturnType<typeof findMaximumWeightMatching>): void {
  expect(result.matching).toHaveLength(graph.length)
  let pairCount = 0
  let totalWeight = 0
  for (const [i, j] of result.matching.entries()) {
    if (j === -1) {
      continue
    }
    expect(j).toBeGreaterThanOrEqual(0)
    expect(j).toBeLessThan(graph.length)
    expect(j).not.toBe(i)
    expect(result.matching[j]).toBe(i)
    expect(graph[i][j]).not.toBe(null)
    if (i < j) {
      pairCount += 1
      totalWeight += graph[i][j] ?? 0
    }
  }
  expect(result.pairCount).toBe(pairCount)
  expect(result.totalWeight).toBe(totalWeight)
}
