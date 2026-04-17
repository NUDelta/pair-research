import { describe, expect, it } from 'vitest'
import { parseGroupMemberInviteRows } from './groupMemberInviteCsv'

describe('parseGroupMemberInviteRows', () => {
  it('parses CSV headers for email, role, and access columns', () => {
    const rows = parseGroupMemberInviteRows([
      'email,role,access',
      'alpha@example.com,Researcher,admin',
      'beta@example.com,Reviewer,member',
    ].join('\n'))

    expect(rows).toEqual([
      { email: 'alpha@example.com', roleValue: 'Researcher', accessValue: 'admin' },
      { email: 'beta@example.com', roleValue: 'Reviewer', accessValue: 'member' },
    ])
  })

  it('treats a single comma-delimited line of emails as separate invite rows', () => {
    const rows = parseGroupMemberInviteRows('alpha@example.com, beta@example.com, gamma@example.com')

    expect(rows).toEqual([
      { email: 'alpha@example.com', roleValue: null, accessValue: null },
      { email: 'beta@example.com', roleValue: null, accessValue: null },
      { email: 'gamma@example.com', roleValue: null, accessValue: null },
    ])
  })
})
