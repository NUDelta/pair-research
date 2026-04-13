import { getInitials } from '@/shared/lib/avatar'
import { cn } from '@/shared/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Card, CardContent } from '@/shared/ui/card'
import RatingControl from './RatingControl'
import TaskDescription from './TaskDescription'
import TaskEditor from './TaskEditor'

type RatingStatus = 'idle' | 'saving' | 'error'
type PoolStatus = 'in-pool' | 'not-in-pool' | 'paired'

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
  } as const

  return (
    <Card className={cn(
      currentUserId === undefined && 'animate-mask-reveal',
      poolStatus === 'in-pool' && 'border-emerald-200 bg-emerald-50/40',
      poolStatus === 'not-in-pool' && 'border-slate-200 bg-slate-50/60',
      poolStatus === 'paired' && 'border-amber-200 bg-amber-50/50',
    )}
    >
      <CardContent className={
        `flex flex-col space-y-4 px-4 py-2
        ${currentUserId === undefined && 'sm:flex-row sm:justify-between'}`
      }
      >
        <div className="space-y-3">
          {poolStatus !== undefined && (
            <div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
                  poolStatus === 'in-pool' && 'bg-emerald-100 text-emerald-900',
                  poolStatus === 'not-in-pool' && 'bg-slate-200 text-slate-700',
                  poolStatus === 'paired' && 'bg-amber-100 text-amber-900',
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
                <TaskDescription description={description ?? 'No task submitted yet.'} />
              )}

          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-6 h-6">
              <AvatarImage
                src={userAvatar ?? undefined}
                alt={`${fullName}'s avatar`}
                loading="lazy"
              />
              <AvatarFallback>
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{fullName ?? 'New User (Name not set)'}</span>
          </div>
        </div>

        {/* Rating Control */}
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
