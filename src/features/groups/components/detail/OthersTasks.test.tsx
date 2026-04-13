import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OthersTasks from './OthersTasks'

const { mockedUseTaskRealtimeListener } = vi.hoisted(() => ({
  mockedUseTaskRealtimeListener: vi.fn(() => ({
    tasks: [],
  })),
}))

vi.mock('@/features/groups/hooks/useTaskRealtimeListener', () => ({
  useTaskRealtimeListener: mockedUseTaskRealtimeListener,
}))

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
        initialTasks={[]}
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
        initialTasks={[]}
      />,
    )

    expect(screen.getByText('This round is complete')).toBeInTheDocument()
    expect(screen.getByText('Wait for an admin to reset the pool before the next round begins.')).toBeInTheDocument()
  })
})
