import { Skeleton } from '@/shared/ui/skeleton'

const AuthControlsLoading = () => {
  return (
    <div className="animate-subtle-rise flex items-center space-x-2">
      <Skeleton className="h-8 w-24 rounded-md" />
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  )
}

export default AuthControlsLoading
