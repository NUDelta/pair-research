import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HorseRace from './HorseRace'

describe('horseRace', () => {
  it('renders all pool members and badges only the top three avatars', () => {
    render(
      <HorseRace
        currentUserId="user-1"
        ratings={{
          'task-2': 4,
          'task-3': 5,
          'task-4': undefined,
        }}
        tasks={[
          {
            id: 'task-1',
            description: 'A',
            userId: 'user-1',
            fullName: 'Ada',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 1,
            ratingsCompletionOrder: 1,
          },
          {
            id: 'task-2',
            description: 'B',
            userId: 'user-2',
            fullName: 'Ben',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 3,
            ratingsCompletionOrder: 9,
          },
          {
            id: 'task-3',
            description: 'C',
            userId: 'user-3',
            fullName: 'Cam',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 2,
            ratingsCompletionOrder: 7,
          },
          {
            id: 'task-4',
            description: 'D',
            userId: 'user-4',
            fullName: 'Dee',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
            ratingsCompletionOrder: null,
          },
        ]}
      />,
    )

    expect(screen.getByText('Horse race')).toBeInTheDocument()
    expect(screen.getByLabelText('Horse race track')).toBeInTheDocument()
    expect(screen.getByLabelText('Ada')).toBeInTheDocument()
    expect(screen.getByLabelText('Ben')).toBeInTheDocument()
    expect(screen.getByLabelText('Cam')).toBeInTheDocument()
    expect(screen.getByLabelText('Dee')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Rank /)).toHaveLength(1)
    expect(screen.getByLabelText('Rank 1')).toBeInTheDocument()
    expect(screen.queryByLabelText('Rank 2')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Rank 3')).not.toBeInTheDocument()
  })

  it('does not render when fewer than two people are in the pool', () => {
    render(
      <HorseRace
        tasks={[
          {
            id: 'task-1',
            description: 'Solo',
            userId: 'user-1',
            fullName: 'Ada',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
            ratingsCompletionOrder: null,
          },
        ]}
      />,
    )

    expect(screen.queryByLabelText('Horse race track')).not.toBeInTheDocument()
  })
})
