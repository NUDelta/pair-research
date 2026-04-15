import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GroupDetailHeader from './GroupDetailHeader'

function MockLink({
  children,
  to,
}: {
  children: ReactNode
  to: string
}) {
  return <a href={to}>{children}</a>
}

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()

  return {
    ...actual,
    Link: MockLink,
  }
})

describe('groupDetailHeader', () => {
  it('renders a link back to the groups page alongside page actions', () => {
    render(
      <GroupDetailHeader
        groupName="Research Collective"
        actions={<button type="button">Settings</button>}
      />,
    )

    expect(screen.getByRole('link', { name: 'Back to groups' })).toHaveAttribute('href', '/groups')
    expect(screen.getByRole('heading', { name: 'Group title' })).toHaveTextContent('Research Collective')
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })
})
