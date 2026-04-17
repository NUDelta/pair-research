import { Skeleton } from '@/shared/ui/skeleton'

export default function AccountPagePending() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <Skeleton className="animate-subtle-rise h-8 w-1/3" />

      <div className="animate-subtle-rise-delayed space-y-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      <div className="animate-subtle-rise-late space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 rounded-xl" />
      </div>

      <div className="animate-subtle-rise-late space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 rounded-xl" />
      </div>

      <Skeleton className="animate-subtle-rise-late h-10 w-32 rounded-xl" />

      <div className="animate-subtle-rise-late space-y-2 pt-8">
        <Skeleton className="h-6 w-1/5" />
        <Skeleton className="h-4 w-2/5" />
      </div>
    </div>
  )
}
