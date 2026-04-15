import { AlertCircleIcon, RotateCcwIcon, UsersIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface ActiveRoundPanelProps {
  currentUserLeftOut: boolean
  isAdmin: boolean
}

export default function ActiveRoundPanel({
  currentUserLeftOut,
  isAdmin,
}: ActiveRoundPanelProps) {
  const icon = isAdmin
    ? <RotateCcwIcon className="size-5 text-amber-600" />
    : currentUserLeftOut
      ? <AlertCircleIcon className="size-5 text-sky-600" />
      : <UsersIcon className="size-5 text-slate-600" />

  const title = currentUserLeftOut && !isAdmin ? 'No pair this round' : 'Round complete'
  const description = isAdmin
    ? currentUserLeftOut
      ? 'One person was left out this round. Reset the pool from the header when you are ready to start the next round.'
      : 'Everyone in the pool was paired this round. Reset the pool from the header when you are ready to start the next round.'
    : currentUserLeftOut
      ? 'You were not paired this round. Wait for an admin to reset the pool before the next round begins.'
      : 'This round is complete. Wait for an admin to reset the pool before the next round begins.'

  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        {icon}
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  )
}
