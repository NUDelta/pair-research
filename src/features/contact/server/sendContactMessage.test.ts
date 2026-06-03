import { describe, expect, it } from 'vitest'
import {
  buildContactEmailSubject,
  buildContactEmailText,
  renderContactEmailHtml,
} from './sendContactMessage'

const contactValues = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Please help me investigate a production contact issue.',
}

describe('contact email helpers', () => {
  it('builds a stable admin email subject and text fallback', () => {
    expect(buildContactEmailSubject(contactValues.name)).toBe('Pair Research contact: Ada Lovelace')
    expect(buildContactEmailText(contactValues)).toContain('Name: Ada Lovelace')
    expect(buildContactEmailText(contactValues)).toContain('Email: ada@example.com')
    expect(buildContactEmailText(contactValues)).toContain(contactValues.message)
  })

  it('renders the React Email template and escapes message content', async () => {
    const html = await renderContactEmailHtml({
      ...contactValues,
      message: 'A message with & characters that should be escaped.',
    })

    expect(html).toContain('New contact message')
    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('ada@example.com')
    expect(html).toContain('A message with &amp; characters that should be escaped.')
  })
})
