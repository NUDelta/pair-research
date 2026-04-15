import type { TaskRatings } from './ratingSummary'
import { TrophyIcon } from 'lucide-react'
import { getInitials } from '@/shared/lib/avatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { getHorseRaceEntries } from './ratingSummary'

interface HorseRaceProps {
  currentUserId?: string
  ratings?: TaskRatings
  tasks: Task[]
}

export default function HorseRace({ currentUserId, ratings, tasks }: HorseRaceProps) {
  const entries = getHorseRaceEntries(tasks, { currentUserId, ratings })

  if (entries.length < 2) {
    return null
  }

  const badgeStyles = {
    1: 'bg-amber-500 text-white shadow-[0_0_0_2px_rgba(255,255,255,0.9)]',
    2: 'bg-slate-400 text-white shadow-[0_0_0_2px_rgba(255,255,255,0.9)]',
    3: 'bg-amber-700 text-white shadow-[0_0_0_2px_rgba(255,255,255,0.9)]',
  } as const

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrophyIcon className="size-5 text-amber-500" />
          Horse race
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="relative h-72 overflow-hidden rounded-4xl border border-dashed border-muted-foreground/30 bg-[linear-gradient(90deg,transparent_0,transparent_24px,rgba(148,163,184,0.18)_24px,rgba(148,163,184,0.18)_28px)] bg-size-[32px_100%]"
          aria-label="Horse race track"
        >
          {entries.map((entry, index) => {
            const laneTop = `${((index + 0.5) / entries.length) * 100}%`

            return (
              <div
                key={`${entry.taskId}-lane`}
                className="pointer-events-none absolute left-0 right-0 border-t border-white/40"
                style={{ top: laneTop }}
              />
            )
          })}

          <div className="absolute inset-y-4 right-4 flex items-center">
            <div className="h-full w-1 rounded-full bg-foreground/80" />
          </div>

          {entries.map((entry, index) => {
            const laneTop = `${((index + 0.5) / entries.length) * 100}%`

            return (
              <div
                key={entry.taskId}
                className="absolute -translate-y-1/2 transition-[left,top] duration-300 ease-out"
                style={{
                  top: laneTop,
                  left: `calc((100% - 4.25rem) * ${entry.progressPercent / 100} + 0.75rem)`,
                }}
              >
                <div
                  className="relative"
                  title={entry.fullName ?? 'Group member'}
                  aria-label={entry.fullName ?? 'Group member'}
                >
                  <Avatar className="size-10 border-2 border-background bg-background shadow-sm">
                    <AvatarImage
                      src={entry.userAvatar ?? undefined}
                      alt={`${entry.fullName ?? 'Group member'} avatar`}
                      loading="lazy"
                    />
                    <AvatarFallback>
                      {getInitials(entry.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  {entry.hasBadge && (
                    <Badge
                      className={`absolute -top-1 -right-1 size-5 rounded-full border-0 px-0 text-[10px] font-semibold ${badgeStyles[entry.rank as 1 | 2 | 3]}`}
                      aria-label={`Rank ${entry.rank}`}
                    >
                      {entry.rank}
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
