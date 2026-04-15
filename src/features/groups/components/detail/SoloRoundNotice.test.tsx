import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SoloRoundNotice from './SoloRoundNotice'

describe('soloRoundNotice', () => {
  it('explains why a member was left out of an odd-sized round', () => {
    render(<SoloRoundNotice />)

    expect(screen.getByText('No Pair This Round')).toBeInTheDocument()
    expect(
      screen.getByText(/The pool had an odd number of people, so the lowest-scoring task was left out this round\./i),
    ).toBeInTheDocument()
    expect(screen.getByText(/An admin can reset the pool to start the next one\./i)).toBeInTheDocument()
  })
})
