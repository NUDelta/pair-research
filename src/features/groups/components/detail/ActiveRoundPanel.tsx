import { AlertCircleIcon, RotateCcwIcon, UsersIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface ActiveRoundPanelProps {
  activePairCount?: number
  currentUserLeftOut: boolean
  isAdmin: boolean
  leftOutNames?: string[]
}

export default function ActiveRoundPanel({
  activePairCount = 0,
  currentUserLeftOut,
  isAdmin,
  leftOutNames = [],
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
  const adminSecondaryDescription = isAdmin
    ? leftOutNames.length > 0
      ? `Left out: ${leftOutNames.join(', ')}. Use Reset Pool in the header when you are ready to start the next round.`
      : 'Everyone in the pool was paired this round. Use Reset Pool in the header when you are ready to start the next round.'
    : null

  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        {icon}
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {description}
        {adminSecondaryDescription !== null && (
          <p>{adminSecondaryDescription}</p>
        )}
      </CardContent>
    </Card>
  )
}
