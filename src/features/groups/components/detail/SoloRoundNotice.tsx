import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

const SoloRoundNotice = () => {
  return (
    <Card className="border-slate-200 bg-slate-50/80">
      <CardHeader>
        <CardTitle>No Pair This Round</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        The pool had an odd number of people, so the lowest-scoring task was left out this round.
        An admin can reset the pool to start the next one.
      </CardContent>
    </Card>
  )
}

export default SoloRoundNotice
