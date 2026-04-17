import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GlobalErrorPage from './GlobalErrorPage'

interface MockLinkProps {
  children: ReactNode
  to: string
}

interface ParsedErrorReport {
  app: string
  error: {
    message: string
    name: string
  }
  reportId: string
  route: {
    href: string
    pathname: string
  }
}

function MockLink({ children, to, ...props }: MockLinkProps & Record<string, unknown>) {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  )
}

vi.mock('@tanstack/react-router', () => ({
  Link: MockLink,
}))

describe('global error page', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders clear recovery actions and lets the user retry', () => {
    const reset = vi.fn()

    render(<GlobalErrorPage error={new Error('Failed to load group details')} reset={reset} />)

    expect(screen.getByRole('heading', { name: /we couldn't load this page/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Failed to load group details/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/support reference/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('downloads a JSON support report', async () => {
    let reportBlob: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      reportBlob = blob
      return 'blob:pair-research-error'
    })
    const revokeObjectURL = vi.fn()
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })

    render(<GlobalErrorPage error={new Error('Database timed out')} reset={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /download report/i }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:pair-research-error')
    expect(screen.getByRole('status')).toHaveTextContent(/downloaded/i)

    expect(reportBlob).toBeInstanceOf(Blob)

    const report = JSON.parse(await reportBlob!.text()) as ParsedErrorReport

    expect(report.app).toBe('Pair Research')
    expect(report.error).toEqual(expect.objectContaining({
      message: 'Database timed out',
      name: 'Error',
    }))
    expect(report.reportId).toMatch(/^PR-/)
    expect(report.route.href).toEqual(expect.any(String))
    expect(report.route.pathname).toEqual(expect.any(String))
  })

  it('handles non-Error thrown values without crashing', () => {
    render(<GlobalErrorPage error="Something strange happened" reset={() => {}} />)

    expect(screen.getAllByText(/Something strange happened/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Thrown string/i)).toBeInTheDocument()
  })
})
