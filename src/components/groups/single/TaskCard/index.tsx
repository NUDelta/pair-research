'use client'

import type { Control } from 'react-hook-form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import TaskDescription from './TaskDescription'

const RatingControl = dynamic(async () => import('./RatingControl'), {
  loading: () => (
    <div className="flex items-center gap-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="rounded-full w-8 h-8" />
      ))}
    </div>
  ),
})

const TaskEditor = dynamic(async () => import('./TaskEditor'), {
  loading: () => <Skeleton className="h-8 w-full" />,
})

interface TaskCardProps {
  taskId?: string
  editable?: boolean
  groupId?: string
  description?: string | null
  fullName?: string | null
  userAvatar?: string | null
  control?: Control<any>
}

export default function TaskCard({
  taskId,
  editable = false,
  groupId,
  description,
  fullName,
  userAvatar,
  control,
}: TaskCardProps) {
  return (
    <Card>
      <CardContent className={
        `flex flex-col space-y-4 px-4 py-2
        ${!editable && 'sm:flex-row sm:justify-between'}`
      }
      >
        <div className="space-y-3">
          {editable && groupId !== undefined
            ? (
                <TaskEditor groupId={groupId} description={description} />
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
                {(fullName)?.[0]?.toUpperCase() ?? 'U'}
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
