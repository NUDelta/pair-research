import { describe, expect, it, vi } from 'vitest'
import { createMatchingOutput } from './createMatchingOutput'
import * as maximumWeightMatching from './maximumWeightMatching'

describe('createMatchingOutput', () => {
  it('returns the stable matching unchanged when the stable pass succeeds', () => {
    const weightedSolver = vi.spyOn(maximumWeightMatching, 'findMaximumWeightMatching')
    expect(createMatchingOutput(
      [
        [0, 8, 7, 1],
        [8, 0, 1, 7],
        [7, 1, 0, 8],
        [1, 7, 8, 0],
      ],
      [
        [0, 16, 14, 2],
        [16, 0, 2, 14],
        [14, 2, 0, 16],
        [2, 14, 16, 0],
      ],
    )).toEqual({
      matching: [1, 0, 3, 2],
      fullyStable: true,
      stableDebug: 'Stable matching found after Phase 1.',
      stableResult: [1, 0, 3, 2],
      mwmResultFull: [],
      mwmResultPartial: [],
      unmatchedParticipantIndexes: [],
    })
    expect(weightedSolver).not.toHaveBeenCalled()
  })

  it('repairs unmatched participants with weighted matching when the stable pass is partial', () => {
    const weightedSolver = vi.spyOn(maximumWeightMatching, 'findMaximumWeightMatching')
    expect(createMatchingOutput(
      [
        [0, 3, 2, 1],
        [2, 0, 3, 1],
        [3, 2, 0, 1],
        [3, 2, 1, 0],
      ],
      [
        [0, 5, 5, 4],
        [5, 0, 5, 3],
        [5, 5, 0, 2],
        [4, 3, 2, 0],
      ],
    )).toEqual({
      matching: [3, 2, 1, 0],
      fullyStable: false,
      stableDebug: 'Failed at Phase 1: not everyone was proposed to.',
      stableResult: [-1, -1, -1, -1],
      mwmResultFull: [],
      mwmResultPartial: [3, 2, 1, 0],
      unmatchedParticipantIndexes: [0, 1, 2, 3],
    })
    expect(weightedSolver).toHaveBeenCalledTimes(1)
  })

  it('avoids leaving the same participant unmatched when an odd-pool alternative exists', () => {
    expect(createMatchingOutput(
      [
        [0, 9, 8],
        [9, 0, 1],
        [8, 1, 0],
      ],
      [
        [0, 18, 16],
        [18, 0, 2],
        [16, 2, 0],
      ],
      {
        avoidUnmatchedParticipantIndex: 0,
      },
    )).toEqual({
      matching: [1, 0, -1],
      fullyStable: true,
      stableDebug: 'Stable matching found after Phase 1.',
      stableResult: [1, 0, -1],
      mwmResultFull: [],
      mwmResultPartial: [],
      unmatchedParticipantIndexes: [],
    })
  })

  it('skips the full weighted solve for a large stable pool', () => {
    const weightedSolver = vi.spyOn(maximumWeightMatching, 'findMaximumWeightMatching')
    const graph = Array.from({ length: 100 }, (_, i) =>
      Array.from({ length: 100 }, (_, j) => i === j ? 0 : (i ^ 1) === j ? 10 : 1))
    const result = createMatchingOutput(graph, graph)
    expect(result.fullyStable).toBe(true)
    expect(result.matching).toEqual(Array.from({ length: 100 }, (_, i) => i ^ 1))
    expect(result.mwmResultFull).toEqual([])
    expect(weightedSolver).not.toHaveBeenCalled()
  })

  it('reconsiders stable pairs when the unmatched subset cannot form a complete round', () => {
    const weightedSolver = vi.spyOn(maximumWeightMatching, 'findMaximumWeightMatching')
    const directed = [
      [0, 2, null, 0, null, null],
      [2, 0, 3, 2, null, 1],
      [null, 3, 0, 1, 0, 3],
      [0, 2, 1, 0, 2, 1],
      [null, null, 3, 3, 0, 3],
      [null, 1, 3, 1, 3, 0],
    ]
    const mutual = directed.map((row, i) => row.map((weight, j) =>
      weight === null ? null : weight + (directed[j][i] ?? 0)))
    const result = createMatchingOutput(directed, mutual)
    expect(result.stableResult).toEqual([-1, 2, 1, 4, 3, -1])
    expect(result.mwmResultPartial).toEqual([-1, -1])
    expect(result.matching).toEqual([1, 0, 5, 4, 3, 2])
    expect(result.mwmResultFull).toEqual(result.matching)
    expect(weightedSolver).toHaveBeenCalledTimes(2)
    expect(weightedSolver.mock.calls.map(([graph]) => graph.length)).toEqual([2, 6])
  })
})
