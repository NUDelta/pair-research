import { AlertCircleIcon, RotateCcwIcon, UsersIcon } from 'lucide-react'
import { getInitials } from '@/shared/lib/avatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface ActiveRoundPanelProps {
  activePairCount?: number
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

export default function ActiveRoundPanel({
  activePairCount = 0,
  currentUserLeftOut,
  isAdmin,
  leftOutNames = [],
  pairSummaries = [],
}: ActiveRoundPanelProps) {
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
    <Card className="border-dashed bg-muted/20">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        {icon}
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>{description}</p>
        {isAdmin && pairSummaries.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pairs this round
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {pairSummaries.map(pairSummary => (
                <div
                  key={pairSummary.id}
                  className="rounded-xl border bg-background/90 p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {pairSummary.members.map((member, index) => (
                      <div key={member.userId} className="contents">
                        {index > 0 && (
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            paired with
                          </span>
                        )}
                        <div
                          className="flex items-center gap-2 rounded-full bg-muted px-3 py-2"
                          title={member.taskDescription ?? 'No task description available.'}
                        >
                          <Avatar className="size-7">
                            <AvatarImage
                              src={member.avatarUrl ?? undefined}
                              alt={`${member.fullName ?? 'Group member'} avatar`}
                              loading="lazy"
                            />
                            <AvatarFallback>
                              {getInitials(member.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">
                            {member.fullName ?? 'Group member'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
