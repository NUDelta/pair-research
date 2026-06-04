import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TaskCard from '.'

describe('taskCard', () => {
  it('uses a safe avatar label when the member name is missing', () => {
    render(
      <TaskCard
        description="Review experiment notes"
        fullName={null}
        userAvatar="/avatar.webp"
      />,
    )

    expect(screen.getByRole('img', { name: 'User avatar' })).toBeInTheDocument()
    expect(screen.getByText('New User (Name not set)')).toBeVisible()
  })
})
