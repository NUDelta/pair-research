import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Footer from './Footer'

describe('footer', () => {
  it('renders the primary support links', () => {
    render(<Footer />)

    expect(screen.getByRole('link', { name: /delta lab website/i })).toHaveAttribute(
      'href',
      'http://delta.northwestern.edu/',
    )
    expect(screen.getByRole('link', { name: /send us a message/i })).toHaveAttribute(
      'href',
      '/contact',
    )
  })
})
