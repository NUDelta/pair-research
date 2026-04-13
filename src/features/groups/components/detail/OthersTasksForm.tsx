import type { TaskRatings } from './ratingSummary'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { upsertHelpCapacities } from '@/features/groups/server/tasks'
import { buildRatingsMap, getRatingSummary } from './ratingSummary'
import TaskCard from './TaskCard'

interface SaveState {
  status: 'idle' | 'saving' | 'error'
  message?: string | null
}

interface OthersTasksFormProps {
  groupId: string
  tasks: Task[]
  canRate: boolean
  currentUserInPool: boolean
}

const OthersTasksForm = ({
  groupId,
  tasks,
  canRate,
  currentUserInPool,
}: OthersTasksFormProps) => {
  const upsertHelpCapacitiesFn = useServerFn(upsertHelpCapacities)
  const [ratings, setRatings] = useState<TaskRatings>(() => buildRatingsMap(tasks))
  const [savedRatings, setSavedRatings] = useState<TaskRatings>(() => buildRatingsMap(tasks))
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const inFlightTaskIdsRef = useRef(new Set<string>())
  const queuedRatingsRef = useRef<TaskRatings>({})
  const savedRatingsRef = useRef<TaskRatings>(buildRatingsMap(tasks))

  useEffect(() => {
    const nextSavedRatings = buildRatingsMap(tasks)
    savedRatingsRef.current = nextSavedRatings
    // eslint-disable-next-line react/set-state-in-effect
    setSavedRatings(nextSavedRatings)
    // eslint-disable-next-line react/set-state-in-effect
    setRatings((current) => {
      const nextRatings: TaskRatings = {}

      for (const task of tasks) {
        const queuedRating = queuedRatingsRef.current[task.id]
        if (inFlightTaskIdsRef.current.has(task.id) || queuedRating !== undefined) {
          nextRatings[task.id] = queuedRating ?? current[task.id] ?? nextSavedRatings[task.id]
          continue
        }

        nextRatings[task.id] = nextSavedRatings[task.id]
      }

      return nextRatings
    })
    // eslint-disable-next-line react/set-state-in-effect
    setSaveStates((current) => {
      const nextStates: Record<string, SaveState> = {}

      for (const task of tasks) {
        const existingState = current[task.id]
        if (existingState !== undefined && existingState.status !== 'idle') {
          nextStates[task.id] = existingState
        }
      }

      return nextStates
    })
  }, [tasks])

  const flushQueuedRating = async (taskId: string) => {
    if (inFlightTaskIdsRef.current.has(taskId)) {
      return
    }

    inFlightTaskIdsRef.current.add(taskId)

    try {
      while (queuedRatingsRef.current[taskId] !== undefined) {
        const nextCapacity = queuedRatingsRef.current[taskId]
        delete queuedRatingsRef.current[taskId]

        if (nextCapacity === undefined) {
          break
        }

        setSaveStates(current => ({
          ...current,
          [taskId]: {
            status: 'saving',
          },
        }))

        const { success, message } = await upsertHelpCapacitiesFn({
          data: {
            groupId,
            updates: [{ taskId, capacity: nextCapacity }],
          },
        })

        if (!success) {
          setRatings(current => ({
            ...current,
            [taskId]: savedRatingsRef.current[taskId],
          }))
          setSaveStates(current => ({
            ...current,
            [taskId]: {
              status: 'error',
              message,
            },
          }))
          toast.error(message)
          return
        }

        savedRatingsRef.current = {
          ...savedRatingsRef.current,
          [taskId]: nextCapacity,
        }
        setSavedRatings(current => ({
          ...current,
          [taskId]: nextCapacity,
        }))
        setSaveStates((current) => {
          const nextStates = { ...current }
          if (queuedRatingsRef.current[taskId] === undefined) {
            delete nextStates[taskId]
          }
          else {
            nextStates[taskId] = { status: 'saving' }
          }
          return nextStates
        })
      }
    }
    finally {
      inFlightTaskIdsRef.current.delete(taskId)
      if (queuedRatingsRef.current[taskId] !== undefined) {
        void flushQueuedRating(taskId)
      }
    }
  }

  const handleRateChange = (taskId: string, capacity: number) => {
    if (!canRate) {
      return
    }

    const savedCapacity = savedRatingsRef.current[taskId]

    if (
      capacity === queuedRatingsRef.current[taskId]
      || (capacity === savedCapacity && !inFlightTaskIdsRef.current.has(taskId))
    ) {
      setSaveStates((current) => {
        if (current[taskId]?.status !== 'error') {
          return current
        }

        const nextStates = { ...current }
        delete nextStates[taskId]
        return nextStates
      })
      return
    }

    queuedRatingsRef.current[taskId] = capacity
    setRatings(current => ({
      ...current,
      [taskId]: capacity,
    }))
    setSaveStates(current => ({
      ...current,
      [taskId]: {
        status: 'saving',
      },
    }))
    void flushQueuedRating(taskId)
  }

  const {
    ratedCount,
    eligibleOthersCount,
    remainingCount,
    progressPercent,
  } = getRatingSummary(tasks, ratings)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h2 id="others-task-list" className="text-xl font-semibold">Others Currently In the Pool</h2>
        {currentUserInPool && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                Rated
                {' '}
                <span className="text-base font-semibold">{ratedCount}</span>
                {' '}
                of
                {' '}
                <span className="text-base font-semibold">{eligibleOthersCount}</span>
                {' '}
                people
              </p>
              <p className="text-sm text-muted-foreground">
                {remainingCount === 0 ? 'All caught up' : `${remainingCount} left`}
              </p>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Ratings completed"
              aria-valuemin={0}
              aria-valuemax={eligibleOthersCount}
              aria-valuenow={ratedCount}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {canRate
            ? 'Rate how ready you feel to help each person on a 1-5 scale. Higher means you feel more able to help.'
            : 'Join the pool to unlock ratings. Only members with an active task in the current pool can rate others.'}
        </p>
      </div>
      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            taskId={task.id}
            description={task.description}
            userAvatar={task.avatarUrl}
            fullName={task.fullName}
            ratingValue={ratings[task.id]}
            savedRatingValue={savedRatings[task.id]}
            ratingStatus={saveStates[task.id]?.status ?? 'idle'}
            ratingMessage={saveStates[task.id]?.message ?? null}
            onRateChange={canRate ? value => handleRateChange(task.id, value) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

export default OthersTasksForm
