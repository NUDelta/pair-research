import { useServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { upsertHelpCapacities } from '@/features/groups/server/tasks'
import TaskCard from './TaskCard'

interface SaveState {
  status: 'idle' | 'saving' | 'error'
  message?: string | null
}

interface OthersTasksFormProps {
  groupId: string
  tasks: Task[]
}

const getValidCapacity = (value: number | null | undefined) => {
  if (value !== undefined && value !== null && value >= 1 && value <= 5) {
    return value
  }

  return undefined
}

const buildRatingsMap = (tasks: Task[]) => {
  return tasks.reduce((acc, task) => {
    acc[task.id] = getValidCapacity(task.helpCapacity)
    return acc
  }, {} as Record<string, number | undefined>)
}

const OthersTasksForm = ({
  groupId,
  tasks,
}: OthersTasksFormProps) => {
  const upsertHelpCapacitiesFn = useServerFn(upsertHelpCapacities)
  const [ratings, setRatings] = useState<Record<string, number | undefined>>(() => buildRatingsMap(tasks))
  const [savedRatings, setSavedRatings] = useState<Record<string, number | undefined>>(() => buildRatingsMap(tasks))
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const inFlightTaskIdsRef = useRef(new Set<string>())
  const queuedRatingsRef = useRef<Record<string, number | undefined>>({})
  const savedRatingsRef = useRef<Record<string, number | undefined>>(buildRatingsMap(tasks))

  useEffect(() => {
    const nextSavedRatings = buildRatingsMap(tasks)
    savedRatingsRef.current = nextSavedRatings
    // eslint-disable-next-line react/set-state-in-effect
    setSavedRatings(nextSavedRatings)
    // eslint-disable-next-line react/set-state-in-effect
    setRatings((current) => {
      const nextRatings: Record<string, number | undefined> = {}

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
      <div className="space-y-1">
        <h2 id="others-task-list" className="text-xl font-semibold">Others Currently In the Pool</h2>
        <p className="text-sm text-muted-foreground">
          Ratings save automatically when you click them.
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
            onRateChange={value => handleRateChange(task.id, value)}
          />
        ))}
      </div>
    </div>
  )
}

export default OthersTasksForm
