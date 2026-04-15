import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import OthersTasks from './OthersTasks'

describe('others tasks empty states', () => {
  it('shows an admin-specific message when the current round is complete', () => {
    render(
      <OthersTasks
        activePairCount={2}
        groupId="group-1"
        currentUserId="user-1"
        currentUserHasTask
        currentUserInPool={false}
        hasActivePairing
        isAdmin
        raceTasks={[]}
        tasks={[]}
      />,
    )

    expect(screen.getByText('Round complete')).toBeInTheDocument()
    expect(screen.getByText('2 pairs were created this round.')).toBeInTheDocument()
    expect(screen.getByText('Everyone in the pool was paired this round. Reset the pool from the header when you are ready to start the next round.')).toBeInTheDocument()
  })

  it('shows an admin-specific message when someone was left out of the round', () => {
    render(
      <OthersTasks
        activePairCount={1}
        groupId="group-1"
        currentUserId="user-1"
        currentUserHasTask
        currentUserInPool={false}
        currentUserLeftOut
        hasActivePairing
        isAdmin
        raceTasks={[]}
        tasks={[
          {
            id: 'task-2',
            description: 'Left out task',
            userId: 'user-3',
            fullName: 'Solo User',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
        ]}
      />,
    )

    expect(screen.getByText('Round complete')).toBeInTheDocument()
    expect(screen.getByText('1 pair was created this round.')).toBeInTheDocument()
    expect(screen.getByText('Left out: Solo User. Reset the pool from the header when you are ready to start the next round.')).toBeInTheDocument()
  })

  it('shows a member-specific message when waiting for an admin reset', () => {
    render(
      <OthersTasks
        activePairCount={1}
        groupId="group-1"
        currentUserId="user-1"
        currentUserHasTask
        currentUserInPool={false}
        hasActivePairing
        isAdmin={false}
        raceTasks={[]}
        tasks={[]}
      />,
    )

    expect(screen.getByText('Round complete')).toBeInTheDocument()
    expect(screen.getByText('This round is complete. Wait for an admin to reset the pool before the next round begins.')).toBeInTheDocument()
  })

  it('shows a personalized member message when they were left out', () => {
    render(
      <OthersTasks
        activePairCount={1}
        groupId="group-1"
        currentUserId="user-1"
        currentUserHasTask
        currentUserInPool={false}
        currentUserLeftOut
        hasActivePairing
        isAdmin={false}
        raceTasks={[]}
        tasks={[]}
      />,
    )

    expect(screen.getByText('No pair this round')).toBeInTheDocument()
    expect(screen.getByText('You were not paired this round. Wait for an admin to reset the pool before the next round begins.')).toBeInTheDocument()
  })

  it('does not show leftover unpaired tasks under others during an active round', () => {
    render(
      <OthersTasks
        activePairCount={1}
        groupId="group-1"
        currentUserId="user-1"
        currentUserHasTask
        currentUserInPool={false}
        hasActivePairing
        isAdmin={false}
        raceTasks={[
          {
            id: 'task-1',
            description: 'Task already paired',
            userId: 'user-2',
            fullName: 'Paired User',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 1,
          },
        ]}
        tasks={[
          {
            id: 'task-2',
            description: 'Left out task',
            userId: 'user-3',
            fullName: 'Solo User',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
        ]}
      />,
    )

    expect(screen.getByText('Round complete')).toBeInTheDocument()
    expect(screen.queryByText('Others Currently In the Pool')).not.toBeInTheDocument()
    expect(screen.queryByText('Left out task')).not.toBeInTheDocument()
  })
})
