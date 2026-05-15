import { AlertCircleIcon, FileTextIcon, Link2Icon, RotateCcwIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { getInitials } from '@/shared/lib/avatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface ActiveRoundPanelProps {
  activePairCount?: number
  currentUserHasActivePairing?: boolean
  currentUserId?: string
  currentUserLeftOut: boolean
  isAdmin: boolean
  leftOutNames?: string[]
  pairSummaries?: Array<{
    id: string
    members: Array<{
      userId: string
      fullName: string | null
      avatarUrl: string | null
      taskDescription: string | null
    }>
  }>
}

interface PairMemberSummaryProps {
  member: {
    userId: string
    fullName: string | null
    avatarUrl: string | null
    taskDescription: string | null
  }
}

type PairSummary = NonNullable<ActiveRoundPanelProps['pairSummaries']>[number]

function orderPairMembers(
  members: PairSummary['members'],
  currentUserId?: string,
) {
  if (currentUserId === undefined) {
    return members
  }

  const currentUserIndex = members.findIndex(member => member.userId === currentUserId)

  if (currentUserIndex <= 0) {
    return members
  }

  return [
    members[currentUserIndex],
    ...members.slice(0, currentUserIndex),
    ...members.slice(currentUserIndex + 1),
  ]
}

function orderPairSummaries(
  pairSummaries: NonNullable<ActiveRoundPanelProps['pairSummaries']>,
  currentUserId?: string,
) {
  const normalizedPairs = pairSummaries.map(pairSummary => ({
    ...pairSummary,
    members: orderPairMembers(pairSummary.members, currentUserId),
  }))

  if (currentUserId === undefined) {
    return normalizedPairs
  }

  const currentUserPairIndex = normalizedPairs.findIndex(pairSummary =>
    pairSummary.members.some(member => member.userId === currentUserId),
  )

  if (currentUserPairIndex <= 0) {
    return normalizedPairs
  }

  return [
    normalizedPairs[currentUserPairIndex],
    ...normalizedPairs.slice(0, currentUserPairIndex),
    ...normalizedPairs.slice(currentUserPairIndex + 1),
  ]
}

function PairMemberSummary({ member }: PairMemberSummaryProps) {
  const taskDescription = member.taskDescription ?? 'No task description available.'
  const [showTaskTooltip, setShowTaskTooltip] = useState(false)
  const memberLabel = member.fullName ?? 'Group member'
  const tooltipId = `pair-task-${member.userId}`

  return (
    <div className="relative flex flex-col items-center gap-3 text-center">
      <Avatar className="size-10 hover-scale-soft">
        <AvatarImage
          src={member.avatarUrl ?? undefined}
          alt={`${memberLabel} avatar`}
          loading="lazy"
        />
        <AvatarFallback>
          {getInitials(member.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <p className="font-medium text-foreground">
          {memberLabel}
        </p>
        <div
          className="relative"
          onMouseEnter={() => setShowTaskTooltip(true)}
          onMouseLeave={() => setShowTaskTooltip(false)}
        >
          <button
            type="button"
            aria-describedby={showTaskTooltip ? tooltipId : undefined}
            aria-label={`Show ${memberLabel}'s task`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover-lift-sm hover:bg-muted hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setShowTaskTooltip(true)}
            onFocus={() => setShowTaskTooltip(true)}
            onBlur={() => setShowTaskTooltip(false)}
          >
            <FileTextIcon className="size-3.5" />
            Task
          </button>
          {showTaskTooltip && (
            <div
              id={tooltipId}
              role="tooltip"
              className="animate-subtle-rise absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-lg border bg-background px-3 py-2 text-sm leading-6 text-foreground shadow-lg"
            >
              {taskDescription}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ActiveRoundPanel({
  activePairCount = 0,
  currentUserHasActivePairing = false,
  currentUserId,
  currentUserLeftOut,
  isAdmin,
  leftOutNames = [],
  pairSummaries = [],
}: ActiveRoundPanelProps) {
  const orderedPairSummaries = orderPairSummaries(pairSummaries, currentUserId)
  const canViewPairSummaries = isAdmin || currentUserHasActivePairing || currentUserLeftOut
  const icon = isAdmin
    ? <RotateCcwIcon className="size-5 text-amber-600" />
    : currentUserLeftOut
      ? <AlertCircleIcon className="size-5 text-sky-600" />
      : <UsersIcon className="size-5 text-slate-600" />

  const title = currentUserLeftOut && !isAdmin ? 'No pair this round' : 'Round complete'
  const description = isAdmin
    ? `${activePairCount === 1 ? '1 pair was' : `${activePairCount} pairs were`} created this round.`
    : currentUserLeftOut
      ? 'You were not paired this round. Wait for an admin to reset the pool from the header before the next round begins.'
      : 'This round is complete. Wait for an admin to reset the pool from the header before the next round begins.'
  const adminResetGuidance = isAdmin
    ? 'Use Reset Pool in the header when you are ready to start the next round.'
    : null

  return (
    <Card className="border-dashed bg-muted/20 hover-lift-sm hover:shadow-md">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        {icon}
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>{description}</p>
        {canViewPairSummaries && orderedPairSummaries.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pairs this round
            </p>
            <div className="grid items-start gap-3 md:grid-cols-2">
              {orderedPairSummaries.map((pairSummary) => {
                return (
                  <div
                    key={pairSummary.id}
                    className="relative z-0 rounded-xl border bg-background/90 p-4 shadow-sm hover-lift-sm hover:z-20 hover:shadow-md focus-within:z-20"
                  >
                    <div className="flex flex-col items-center gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                      <div className="flex justify-center sm:justify-end">
                        {pairSummary.members[0] !== undefined && (
                          <PairMemberSummary member={pairSummary.members[0]} />
                        )}
                      </div>
                      {pairSummary.members[1] !== undefined && (
                        <div className="flex items-center justify-center">
                          <div className="rounded-full border border-border bg-muted/50 p-2 text-muted-foreground">
                            <Link2Icon className="size-4" />
                          </div>
                        </div>
                      )}
                      <div className="flex justify-center sm:justify-start">
                        {pairSummary.members[1] !== undefined && (
                          <PairMemberSummary member={pairSummary.members[1]} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {isAdmin && leftOutNames.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-900">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <p>
              Left out this round:
              {' '}
              {leftOutNames.join(', ')}
            </p>
          </div>
        )}
        {adminResetGuidance !== null && (
          <p>{adminResetGuidance}</p>
        )}
      </CardContent>
    </Card>
  )
}
