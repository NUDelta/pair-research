import { cn } from '@/shared/lib/utils'

interface RatingControlProps {
  taskId?: string
  value?: number
  savedValue?: number
  status?: 'idle' | 'saving' | 'error'
  message?: string | null
  onChange: (value: number) => void
}

const RatingControl = ({
  taskId,
  value,
  savedValue,
  status = 'idle',
  message,
  onChange,
}: RatingControlProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-start rounded-md transition-colors',
        'gap-1 px-2 py-1',
        status === 'saving' && 'bg-amber-50',
        status === 'error' && 'bg-rose-50',
      )}
    >
      <fieldset
        className="flex items-center gap-1"
        aria-label="Rate your ability to help"
        aria-busy={status === 'saving'}
      >
        <legend className="sr-only">Help Rating</legend>
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = value === n
          const isSaved = savedValue === n

          return (
            <button
              key={n}
              type="button"
              className={cn(
                'rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                'h-7 w-7 text-sm',
                isSelected ? 'bg-primary text-white hover:bg-primary' : 'bg-gray-100 hover:bg-gray-200',
                isSaved ? 'border-primary/50' : 'border-transparent',
                status === 'saving' && isSelected && 'bg-amber-300 text-amber-950 hover:bg-amber-300',
                status === 'error' && isSelected && 'bg-rose-200 text-rose-950 hover:bg-rose-200',
              )}
              onClick={() => onChange(n)}
              aria-label={`Rate ${n}`}
              aria-pressed={isSelected}
              data-task-id={taskId}
            >
              {n}
            </button>
          )
        })}
      </fieldset>
      <p
        className={cn(
          'min-h-3 text-xs',
          status === 'saving' && 'text-amber-800',
          status === 'error' && 'text-rose-700',
          status === 'idle' && 'text-transparent',
        )}
        aria-live="polite"
      >
        {status === 'saving'
          ? 'Saving rating...'
          : status === 'error'
            ? (message ?? 'Failed to save rating.')
            : '\u00A0'}
      </p>
    </div>
  )
}

export default RatingControl
