import { cn } from '@/shared/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative isolate overflow-hidden rounded-md bg-muted/70',
        'before:absolute before:inset-y-0 before:left-0 before:w-1/2 before:-translate-x-full',
        'before:motion-safe:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]',
        'before:bg-linear-to-r before:from-transparent before:via-white/80 before:to-transparent',
        'dark:before:via-white/15',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
