import type { FieldError } from 'react-hook-form'
import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import AuthField from './AuthField'

function AuthFieldHarness({ error }: { error?: FieldError }) {
  const { register } = useForm<{ email: string }>()

  return (
    <AuthField
      id="email"
      label="Email"
      type="email"
      autocomplete="email"
      error={error}
      register={register}
    />
  )
}

describe('auth field', () => {
  it('links input validation state to the rendered error message', () => {
    render(<AuthFieldHarness error={{ type: 'required', message: 'Email is required.' }} />)

    const input = screen.getByLabelText('Email')
    const error = screen.getByText('Email is required.')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', error.id)
  })

  it('does not describe the input when there is no error', () => {
    render(<AuthFieldHarness />)

    const input = screen.getByLabelText('Email')

    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(input).not.toHaveAttribute('aria-describedby')
  })
})
