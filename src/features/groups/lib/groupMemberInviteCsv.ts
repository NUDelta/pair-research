import { groupMemberInviteSchema } from '../schemas/groupManagement'

export interface ParsedGroupMemberInviteRow {
  email: string
  roleValue: string | null
  accessValue: string | null
}

const emailHeaderAliases = new Set(['email', 'member', 'memberemail', 'member_email'])
const roleHeaderAliases = new Set(['role', 'roletitle', 'role_title', 'title', 'memberrole', 'member_role'])
const accessHeaderAliases = new Set(['access', 'admin', 'isadmin', 'is_admin'])

export function parseGroupMemberInviteRows(source: string): ParsedGroupMemberInviteRow[] {
  const rows = source
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map(line => parseCsvLine(line).map(value => value.trim()))
    .filter(row => row.some(value => value.length > 0))

  if (rows.length === 0) {
    return []
  }

  if (rows.length === 1 && rows[0] !== undefined && looksLikeEmailList(rows[0])) {
    return rows[0].map(email => ({
      email,
      roleValue: null,
      accessValue: null,
    }))
  }

  const [firstRow, ...remainingRows] = rows
  if (firstRow === undefined) {
    return []
  }

  const headerMap = buildHeaderMap(firstRow)
  const dataRows = headerMap === null ? rows : remainingRows

  return dataRows
    .map((row) => {
      if (headerMap === null) {
        return {
          email: row[0] ?? '',
          roleValue: row[1] ?? null,
          accessValue: row[2] ?? null,
        }
      }

      return {
        email: row[headerMap.email] ?? '',
        roleValue: headerMap.role === null ? null : (row[headerMap.role] ?? null),
        accessValue: headerMap.access === null ? null : (row[headerMap.access] ?? null),
      }
    })
    .filter(row => row.email.trim().length > 0)
}

function buildHeaderMap(row: string[]) {
  const normalizedHeaders = row.map(header => normalizeHeader(header))
  const emailIndex = normalizedHeaders.findIndex(header => emailHeaderAliases.has(header))

  if (emailIndex === -1) {
    return null
  }

  return {
    email: emailIndex,
    role: toNullableIndex(normalizedHeaders.findIndex(header => roleHeaderAliases.has(header))),
    access: toNullableIndex(normalizedHeaders.findIndex(header => accessHeaderAliases.has(header))),
  }
}

function looksLikeEmailList(columns: string[]) {
  return columns.every((value) => {
    const parsedInvite = groupMemberInviteSchema.safeParse({
      email: value.trim().toLowerCase(),
      roleId: '1',
      isAdmin: false,
    })
    return parsedInvite.success
  })
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replaceAll(/[\s-]+/g, '').replaceAll('.', '')
}

function toNullableIndex(index: number) {
  return index >= 0 ? index : null
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let currentValue = ''
  let isQuoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      const nextCharacter = line[index + 1]
      if (isQuoted && nextCharacter === '"') {
        currentValue += '"'
        index += 1
        continue
      }

      isQuoted = !isQuoted
      continue
    }

    if (character === ',' && !isQuoted) {
      values.push(currentValue)
      currentValue = ''
      continue
    }

    currentValue += character
  }

  values.push(currentValue)
  return values
}
