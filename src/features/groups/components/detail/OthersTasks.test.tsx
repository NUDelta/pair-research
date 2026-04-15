import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import OthersTasks from './OthersTasks'

describe('others tasks empty states', () => {
  it('shows an admin-specific message when the current round is complete', () => {
    render(
      <OthersTasks
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

    expect(screen.getByText('This round is complete')).toBeInTheDocument()
    expect(screen.getByText('Reset the pool when you are ready to start the next pairing round.')).toBeInTheDocument()
  })

  it('shows a member-specific message when waiting for an admin reset', () => {
    render(
      <OthersTasks
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

    expect(screen.getByText('This round is complete')).toBeInTheDocument()
    expect(screen.getByText('Wait for an admin to reset the pool before the next round begins.')).toBeInTheDocument()
  })

  it('does not show leftover unpaired tasks under others during an active round', () => {
    render(
      <OthersTasks
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

    expect(screen.getByText('This round is complete')).toBeInTheDocument()
    expect(screen.queryByText('Others Currently In the Pool')).not.toBeInTheDocument()
    expect(screen.queryByText('Left out task')).not.toBeInTheDocument()
  })
})
