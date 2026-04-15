import { getInitials } from '@/shared/lib/avatar'
import { cn } from '@/shared/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Card, CardContent } from '@/shared/ui/card'
import RatingControl from './RatingControl'
import TaskDescription from './TaskDescription'
import TaskEditor from './TaskEditor'

type RatingStatus = 'idle' | 'saving' | 'error'
type PoolStatus = 'in-pool' | 'not-in-pool' | 'paired' | 'solo'

interface TaskCardProps {
  taskId?: string
  currentUserId?: string
  groupId?: string
  description?: string | null
  fullName?: string | null
  userAvatar?: string | null
  ratingValue?: number
  savedRatingValue?: number
  ratingStatus?: RatingStatus
  ratingMessage?: string | null
  onRateChange?: (value: number) => void
  poolStatus?: PoolStatus
}

export default function TaskCard({
  taskId,
  currentUserId,
  groupId,
  description,
  fullName,
  userAvatar,
  ratingValue,
  savedRatingValue,
  ratingStatus = 'idle',
  ratingMessage,
  onRateChange,
  poolStatus,
}: TaskCardProps) {
  const poolStatusLabel = {
    'in-pool': 'In Pool',
    'not-in-pool': 'Not In Pool',
    'paired': 'Currently Paired',
    'solo': 'No Pair This Round',
  } as const

  return (
    <Card className={cn(
      currentUserId === undefined && 'animate-mask-reveal',
      poolStatus === 'in-pool' && 'border-emerald-200 bg-emerald-50/40',
      poolStatus === 'not-in-pool' && 'border-slate-200 bg-slate-50/60',
      poolStatus === 'paired' && 'border-amber-200 bg-amber-50/50',
      poolStatus === 'solo' && 'border-sky-200 bg-sky-50/60',
    )}
    >
      <CardContent
        className={cn(
          'flex flex-col',
          'gap-2 px-3 py-1',
          currentUserId === undefined && 'sm:flex-row sm:justify-between',
          currentUserId === undefined && 'sm:items-center sm:gap-4',
        )}
      >
        <div className="space-y-1.5">
          {poolStatus !== undefined && (
            <div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                  poolStatus === 'in-pool' && 'bg-emerald-100 text-emerald-900',
                  poolStatus === 'not-in-pool' && 'bg-slate-200 text-slate-700',
                  poolStatus === 'paired' && 'bg-amber-100 text-amber-900',
                  poolStatus === 'solo' && 'bg-sky-100 text-sky-900',
                )}
              >
                {poolStatusLabel[poolStatus]}
              </span>
            </div>
          )}
          {currentUserId !== undefined && groupId !== undefined
            ? (
                <TaskEditor
                  groupId={groupId}
                  currentUserId={currentUserId}
                  initialDescription={description}
                />
              )
            : (
                <TaskDescription
                  description={description ?? 'No task submitted yet.'}
                />
              )}

          <div className="flex items-center gap-2 pt-1">
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={userAvatar ?? undefined}
                alt={`${fullName}'s avatar`}
                loading="lazy"
              />
              <AvatarFallback>
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">
              {fullName ?? 'New User (Name not set)'}
            </span>
          </div>
        </div>

        {taskId !== undefined && onRateChange !== undefined && (
          <RatingControl
            taskId={taskId}
            value={ratingValue}
            savedValue={savedRatingValue}
            status={ratingStatus}
            message={ratingMessage}
            onChange={onRateChange}
          />
        )}
      </CardContent>
    </Card>
  )
}
