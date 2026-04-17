import { Skeleton } from '@/shared/ui/skeleton'

export default function GroupsPagePending() {
  const pendingSkeletonKeys = ['pending-1', 'pending-2']
  const joinedSkeletonKeys = ['joined-1', 'joined-2', 'joined-3']

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="animate-subtle-rise flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <section className="animate-subtle-rise-delayed">
        <Skeleton className="mb-4 h-6 w-52" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pendingSkeletonKeys.map(skeletonKey => (
            <CardSkeleton key={skeletonKey} />
          ))}
        </div>
      </section>

      <section className="animate-subtle-rise-late">
        <Skeleton className="mb-4 h-6 w-44" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {joinedSkeletonKeys.map(skeletonKey => (
            <CardSkeleton key={skeletonKey} />
          ))}
        </div>
      </section>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-2 h-4 w-24" />
    </div>
  )
}
