import type { Control } from 'react-hook-form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { getInitials } from '@/utils/avatar'
import RatingControl from './RatingControl'
import TaskDescription from './TaskDescription'
import TaskEditor from './TaskEditor'

interface CapacitiesFormValues {
  capacities: Record<string, number | undefined>
}

interface TaskCardProps {
  taskId?: string
  currentUserId?: string
  groupId?: string
  description?: string | null
  fullName?: string | null
  userAvatar?: string | null
  control?: Control<CapacitiesFormValues>
}

export default function TaskCard({
  taskId,
  currentUserId,
  groupId,
  description,
  fullName,
  userAvatar,
  control,
}: TaskCardProps) {
  return (
    <Card className={currentUserId === undefined ? 'animate-mask-reveal' : ''}>
      <CardContent className={
        `flex flex-col space-y-4 px-4 py-2
        ${currentUserId === undefined && 'sm:flex-row sm:justify-between'}`
      }
      >
        <div className="space-y-3">
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
        {taskId !== undefined && control !== undefined && (
          <RatingControl
            taskId={taskId}
            control={control}
          />
        )}
      </CardContent>
    </Card>
  )
}
