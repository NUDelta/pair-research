import { Skeleton } from '@/shared/ui/skeleton'

export default function SingleGroupPending() {
  const taskSkeletonKeys = ['task-1', 'task-2', 'task-3']
  const ratingSkeletonKeys = ['rating-1', 'rating-2', 'rating-3', 'rating-4', 'rating-5']

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4">
      <div className="animate-subtle-rise flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="hidden h-8 w-24 rounded-xl sm:block" />
          <Skeleton className="hidden h-8 w-24 rounded-xl sm:block" />
        </div>
      </div>

      <div className="animate-subtle-rise-delayed space-y-3 rounded-md border p-4 shadow-sm">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-4 h-6 w-1/4" />
      </div>

      <div className="animate-subtle-rise-late space-y-4">
        <Skeleton className="h-6 w-40" />
        {taskSkeletonKeys.map(taskKey => (
          <div
            key={taskKey}
            className="flex flex-col justify-between space-y-4 rounded-md border p-4 shadow-sm sm:flex-row sm:space-y-0"
          >
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="mt-2 flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              {ratingSkeletonKeys.map(ratingKey => (
                <Skeleton key={`${taskKey}-${ratingKey}`} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
