export function getNextOptimisticRoleId(
  counterRef: { current: number },
  prefix: string,
) {
  counterRef.current += 1
  return `${prefix}-${counterRef.current}`
}
