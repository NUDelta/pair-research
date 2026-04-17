export function formatPairingRelativeTime(isoTimestamp: string, now = new Date()) {
  const target = new Date(isoTimestamp)
  const diffMs = now.getTime() - target.getTime()

  if (Number.isNaN(target.getTime()) || diffMs < 0) {
    return null
  }

  const dayMs = 24 * 60 * 60 * 1000
  const weekMs = 7 * dayMs
  const monthMs = 30 * dayMs
  const yearMs = 365 * dayMs

  if (diffMs < dayMs) {
    return 'today'
  }

  const days = Math.floor(diffMs / dayMs)
  if (days === 1) {
    return 'yesterday'
  }

  if (diffMs < weekMs) {
    return `${days} days ago`
  }

  const weeks = Math.floor(diffMs / weekMs)
  if (diffMs < monthMs) {
    return weeks === 1 ? 'last week' : `${weeks} weeks ago`
  }

  const months = Math.floor(diffMs / monthMs)
  if (diffMs < yearMs) {
    return months === 1 ? 'last month' : `${months} months ago`
  }

  const years = Math.floor(diffMs / yearMs)
  return years === 1 ? 'last year' : `${years} years ago`
}
