import { Skeleton } from '@/shared/ui/skeleton'

export default function CreateGroupPending() {
  return (
    <div className="container mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <Skeleton className="animate-subtle-rise h-8 w-56" />
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={5} />
        <div className="animate-subtle-rise-late rounded-lg border p-6">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="space-y-4">
            <Skeleton className="h-12 rounded-xl" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  const skeletonLineKeys = Array.from({ length: lines }, (_, index) => `line-${index + 1}`)

  return (
    <div className="animate-subtle-rise-delayed space-y-4 rounded-lg border p-6">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-3">
        {skeletonLineKeys.map(lineKey => (
          <Skeleton key={lineKey} className="h-10 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
