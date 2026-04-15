import type { TaskRatings } from './ratingSummary'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { upsertHelpCapacities } from '@/features/groups/server/tasks'
import HorseRace from './HorseRace'
import { buildRatingsMap } from './ratingSummary'
import TaskCard from './TaskCard'

interface SaveState {
  status: 'idle' | 'saving' | 'error'
  message?: string | null
}

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

  return (
    <div className="space-y-4">
      <HorseRace
        currentUserId={currentUserId}
        ratings={ratings}
        tasks={raceTasks}
      />
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
          />
        ))}
      </div>
    </div>
  )
}

export default OthersTasksForm
