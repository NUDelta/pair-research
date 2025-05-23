export const getInitials = (name?: string | null) => {
  if (name === null || name === undefined || name.trim().length === 0) {
    return 'U'
  }
  return name.trim()[0].toUpperCase()
}
