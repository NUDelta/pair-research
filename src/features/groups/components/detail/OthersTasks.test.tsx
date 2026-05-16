import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/shared/ui/tooltip'
import OthersTasks from './OthersTasks'

function renderWithTooltipProvider(element: ReactElement) {
  return render(
    <TooltipProvider>
      {element}
    </TooltipProvider>,
  )
}

describe('others tasks empty states', () => {
  it('shows an admin-specific message when the current round is complete', () => {
    renderWithTooltipProvider(
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
    expect(screen.getByText('Use Reset Pool in the header when you are ready to start the next round.')).toBeInTheDocument()
  })

  it('shows an admin-specific message when someone was left out of the round', async () => {
    const user = userEvent.setup()

    renderWithTooltipProvider(
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
        activeRoundPairs={[
          {
            id: 'pair-1',
            members: [
              {
                userId: 'user-4',
                fullName: 'Pair One',
                avatarUrl: null,
                taskDescription: 'Draft section one',
              },
              {
                userId: 'user-5',
                fullName: 'Pair Two',
                avatarUrl: null,
                taskDescription: 'Review section two',
              },
            ],
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
    expect(screen.getByText('1 pair was created this round.')).toBeInTheDocument()
    expect(screen.getByText('Pairs this round')).toBeInTheDocument()
    expect(screen.getByText('Pair One')).toBeInTheDocument()
    expect(screen.getByText('Pair Two')).toBeInTheDocument()
    expect(screen.queryByText('Draft section one')).not.toBeInTheDocument()
    expect(screen.queryByText('Review section two')).not.toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: `Show Pair One's task` }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Draft section one')

    await user.unhover(screen.getByRole('button', { name: `Show Pair One's task` }))
    await user.click(screen.getByRole('button', { name: `Show Pair Two's task` }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Review section two')
    expect(screen.getByText('Left out this round: Solo User')).toBeInTheDocument()
    expect(screen.getByText('Use Reset Pool in the header when you are ready to start the next round.')).toBeInTheDocument()
  })

  it('shows a member-specific message when waiting for an admin reset', () => {
    renderWithTooltipProvider(
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
    expect(screen.getByText('This round is complete. Wait for an admin to reset the pool from the header before the next round begins.')).toBeInTheDocument()
  })

  it('shows all pairs to non-admin members who were matched, with their pair first and their profile first', () => {
    renderWithTooltipProvider(
      <OthersTasks
        activePairCount={2}
        activeRoundPairs={[
          {
            id: 'pair-2',
            members: [
              {
                userId: 'user-3',
                fullName: 'Barbara Liskov',
                avatarUrl: null,
                taskDescription: 'Refine analysis',
              },
              {
                userId: 'user-4',
                fullName: 'Donald Knuth',
                avatarUrl: null,
                taskDescription: 'Review appendix',
              },
            ],
          },
          {
            id: 'pair-1',
            members: [
              {
                userId: 'user-2',
                fullName: 'Grace Hopper',
                avatarUrl: null,
                taskDescription: 'Review figures',
              },
              {
                userId: 'user-1',
                fullName: 'Ada Lovelace',
                avatarUrl: null,
                taskDescription: 'Draft methods',
              },
            ],
          },
        ]}
        currentUserHasActivePairing
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

    expect(screen.getByText('Pairs this round')).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('button', { name: /Show .*'s task/ })
        .map(button => button.getAttribute('aria-label')),
    ).toEqual([
      'Show Ada Lovelace\'s task',
      'Show Grace Hopper\'s task',
      'Show Barbara Liskov\'s task',
      'Show Donald Knuth\'s task',
    ])
  })

  it('shows a personalized member message when they were left out', () => {
    renderWithTooltipProvider(
      <OthersTasks
        activePairCount={1}
        activeRoundPairs={[
          {
            id: 'pair-1',
            members: [
              {
                userId: 'user-2',
                fullName: 'Grace Hopper',
                avatarUrl: null,
                taskDescription: 'Review figures',
              },
              {
                userId: 'user-3',
                fullName: 'Barbara Liskov',
                avatarUrl: null,
                taskDescription: 'Refine analysis',
              },
            ],
          },
        ]}
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
    expect(screen.getByText('You were not paired this round. Wait for an admin to reset the pool from the header before the next round begins.')).toBeInTheDocument()
    expect(screen.getByText('Pairs this round')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('Barbara Liskov')).toBeInTheDocument()
  })

  it('does not show leftover unpaired tasks under others during an active round', () => {
    renderWithTooltipProvider(
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

  it('renders the horse race below the active-round panel', () => {
    renderWithTooltipProvider(
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
            description: 'Task one',
            userId: 'user-1',
            fullName: 'Ada',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 1,
          },
          {
            id: 'task-2',
            description: 'Task two',
            userId: 'user-2',
            fullName: 'Grace',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
        ]}
        tasks={[]}
      />,
    )

    const roundHeading = screen.getByText('Round complete')
    const horseRaceHeading = screen.getByText('Horse race')

    expect(roundHeading.compareDocumentPosition(horseRaceHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('points members without a task to the task card above', () => {
    renderWithTooltipProvider(
      <OthersTasks
        groupId="group-1"
        currentUserId="user-1"
        currentUserHasTask={false}
        currentUserInPool={false}
        raceTasks={[]}
        tasks={[]}
      />,
    )

    expect(screen.getByText('Add your task from the card above to join the pool and get the round started.')).toBeInTheDocument()
  })

  it('tells a solo pool member to get another task into the round', () => {
    renderWithTooltipProvider(
      <OthersTasks
        groupId="group-1"
        currentUserId="user-1"
        currentUserHasTask
        currentUserInPool
        raceTasks={[]}
        tasks={[]}
      />,
    )

    expect(screen.getByText('Ask another member to add a task so ratings can start.')).toBeInTheDocument()
    expect(screen.getByText('You\'re the only person in the pool right now.')).toBeInTheDocument()
  })

  it('renders the horse race below the empty others state', () => {
    renderWithTooltipProvider(
      <OthersTasks
        groupId="group-1"
        currentUserId="user-1"
        currentUserHasTask
        currentUserInPool
        raceTasks={[
          {
            id: 'task-1',
            description: 'Task one',
            userId: 'user-1',
            fullName: 'Ada',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 1,
          },
          {
            id: 'task-2',
            description: 'Task two',
            userId: 'user-2',
            fullName: 'Grace',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
        ]}
        tasks={[]}
      />,
    )

    const emptyHeading = screen.getByText('No tasks from others yet')
    const horseRaceHeading = screen.getByText('Horse race')

    expect(emptyHeading.compareDocumentPosition(horseRaceHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('tells members with a saved task but not in the pool how to rejoin', () => {
    renderWithTooltipProvider(
      <OthersTasks
        groupId="group-1"
        currentUserId="user-1"
        currentUserHasTask
        currentUserInPool={false}
        raceTasks={[]}
        tasks={[]}
      />,
    )

    expect(screen.getByText('Add your task from the card above to rejoin the pool for this round.')).toBeInTheDocument()
  })
})
