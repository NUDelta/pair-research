export function normalizeNullableDescription(description: string) {
  const trimmed = description.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase()
}

export function normalizeRoleTitle(title: string) {
  return title.trim()
}
