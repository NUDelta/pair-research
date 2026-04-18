interface BulkMemberRemovalCandidate {
  displayName: string
  userId: string
}

interface BulkMemberRemovalResponse {
  message: string
  success: boolean
}

interface PerformBulkMemberRemovalOptions<TMember extends BulkMemberRemovalCandidate> {
  applyOptimisticRemoval: (userIds: string[]) => () => void
  members: TMember[]
  onError: (message: string) => void
  onInvalidate: () => void
  onSelectionReset: () => void
  onSuccess: (message: string) => void
  removeMember: (member: TMember) => Promise<BulkMemberRemovalResponse>
}

export async function performBulkMemberRemoval<TMember extends BulkMemberRemovalCandidate>({
  applyOptimisticRemoval,
  members,
  onError,
  onInvalidate,
  onSelectionReset,
  onSuccess,
  removeMember,
}: PerformBulkMemberRemovalOptions<TMember>) {
  const removableMemberIds = members.map(member => member.userId)
  const failedMemberIds: string[] = []
  const rollback = applyOptimisticRemoval(removableMemberIds)
  let removedCount = 0
  const failures: string[] = []

  onSelectionReset()

  for (const member of members) {
    const response = await removeMember(member)

    if (response.success) {
      removedCount += 1
      continue
    }

    failedMemberIds.push(member.userId)
    failures.push(`${member.displayName}: ${response.message}`)
  }

  if (failedMemberIds.length > 0) {
    rollback()

    const succeededMemberIds = removableMemberIds.filter(userId => !failedMemberIds.includes(userId))
    if (succeededMemberIds.length > 0) {
      applyOptimisticRemoval(succeededMemberIds)
    }
  }

  if (removedCount > 0) {
    onInvalidate()
    onSuccess(`Removed ${removedCount} selected ${removedCount === 1 ? 'member' : 'members'}.`)
  }

  if (failures.length === 1) {
    onError(failures[0])
  }
  else if (failures.length > 1) {
    onError(`${failures.length} selected members could not be removed.`)
  }
}
