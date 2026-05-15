import type { TaskRatings } from './ratingSummary'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { upsertHelpCapacities } from '@/features/groups/server/tasks'
import HorseRace from './HorseRace'
import { buildRatingsMap, getValidCapacity } from './ratingSummary'
import TaskCard from './TaskCard'

interface SaveState {
  status: 'idle' | 'saving' | 'error'
  message?: string | null
}

const RATING_SAVE_BATCH_DELAY_MS = 150

interface OthersTasksFormProps {
  currentUserId: string
  groupId: string
  raceTasks: Task[]
  tasks: Task[]
  canRate: boolean
}

const OthersTasksForm = ({
  currentUserId,
  groupId,
  raceTasks,
  tasks,
  canRate,
}: OthersTasksFormProps) => {
  const upsertHelpCapacitiesFn = useServerFn(upsertHelpCapacities)
  const [ratings, setRatings] = useState<TaskRatings>(() => buildRatingsMap(tasks))
  const [savedRatings, setSavedRatings] = useState<TaskRatings>(() => buildRatingsMap(tasks))
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const inFlightTaskIdsRef = useRef(new Set<string>())
  const batchInFlightRef = useRef(false)
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>()
  const queuedRatingsRef = useRef<TaskRatings>({})
  const savedRatingsRef = useRef<TaskRatings>(buildRatingsMap(tasks))

  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== undefined) {
        clearTimeout(flushTimerRef.current)
      }
    }
  }, [])

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

  const flushQueuedRatings = async () => {
    if (batchInFlightRef.current) {
      return
    }

    const batch = Object.entries(queuedRatingsRef.current)
      .flatMap(([taskId, capacity]) => capacity === undefined ? [] : [{ taskId, capacity }])

    if (batch.length === 0) {
      return
    }

    queuedRatingsRef.current = {}
    batchInFlightRef.current = true
    batch.forEach(({ taskId }) => inFlightTaskIdsRef.current.add(taskId))

    try {
      const { success, message } = await upsertHelpCapacitiesFn({
        data: {
          groupId,
          updates: batch,
        },
      })

      if (!success) {
        setRatings(current => batch.reduce<TaskRatings>((nextRatings, { taskId }) => ({
          ...nextRatings,
          [taskId]: savedRatingsRef.current[taskId],
        }), { ...current }))
        setSaveStates(current => batch.reduce<Record<string, SaveState>>((nextStates, { taskId }) => ({
          ...nextStates,
          [taskId]: {
            status: 'error',
            message,
          },
        }), { ...current }))
        toast.error(message)
        return
      }

      const savedBatchRatings = batch.reduce<TaskRatings>((nextRatings, { taskId, capacity }) => ({
        ...nextRatings,
        [taskId]: capacity,
      }), {})

      savedRatingsRef.current = {
        ...savedRatingsRef.current,
        ...savedBatchRatings,
      }
      setSavedRatings(current => ({
        ...current,
        ...savedBatchRatings,
      }))
      setSaveStates((current) => {
        const nextStates = { ...current }
        for (const { taskId } of batch) {
          if (queuedRatingsRef.current[taskId] === undefined) {
            delete nextStates[taskId]
          }
          else {
            nextStates[taskId] = { status: 'saving' }
          }
        }
        return nextStates
      })
    }
    finally {
      batch.forEach(({ taskId }) => inFlightTaskIdsRef.current.delete(taskId))
      batchInFlightRef.current = false
      if (Object.keys(queuedRatingsRef.current).length > 0) {
        void flushQueuedRatings()
      }
    }
  }

  const scheduleRatingFlush = () => {
    if (flushTimerRef.current !== undefined) {
      clearTimeout(flushTimerRef.current)
    }

    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = undefined
      void flushQueuedRatings()
    }, RATING_SAVE_BATCH_DELAY_MS)
  }

  const handleRateChange = (taskId: string, capacity: number) => {
    if (!canRate || inFlightTaskIdsRef.current.has(taskId)) {
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
    scheduleRatingFlush()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h2 id="others-task-list" className="text-xl font-semibold">Others Currently In the Pool</h2>
        {canRate
          ? (
              <>
                <p className="text-sm text-muted-foreground md:hidden">
                  How much can you help with each of these tasks? (1: not at all, 5: totally)
                </p>
                <div className="hidden items-center justify-between gap-4 text-sm text-muted-foreground md:flex">
                  <p>How much can you help with each of these tasks?</p>
                  <p>(1: not at all, 5: totally)</p>
                </div>
              </>
            )
          : (
              <p className="text-sm text-muted-foreground">
                Join the pool to unlock ratings. Only members with an active task in the current pool can rate others.
              </p>
            )}
      </div>
      <div className="space-y-2">
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
            showUnratedBadge={canRate && getValidCapacity(ratings[task.id]) === undefined}
          />
        ))}
      </div>
      <HorseRace
        currentUserId={currentUserId}
        ratings={ratings}
        tasks={raceTasks}
      />
    </div>
  )
}

export default OthersTasksForm
