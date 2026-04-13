import type { Control } from 'react-hook-form'
import { useController } from 'react-hook-form'

interface CapacitiesFormValues {
  capacities: Record<string, number | undefined>
}

interface RatingControlProps {
  taskId?: string
  control?: Control<CapacitiesFormValues>
}

const RatingControl = ({ taskId, control }: RatingControlProps) => {
  const {
    field: { value, onChange },
    formState,
  } = useController<CapacitiesFormValues>({
    name: `capacities.${String(taskId)}`,
    control,
    defaultValue: 0,
  })

  const defaultValue = formState.defaultValues?.capacities?.[String(taskId)] ?? 0

  return (
    <div className="flex items-center gap-2">
      <fieldset className="flex items-center gap-1" aria-label="Rate your ability to help">
        <legend className="sr-only">Help Rating</legend>
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = value === n
          const isDefault = defaultValue === n

          return (
            <button
              key={n}
              type="button"
              className={`rounded-full w-8 h-8 text-sm border
              ${isSelected ? 'bg-primary text-white hover:bg-primary' : 'bg-gray-100 hover:bg-gray-200'}
              ${isDefault ? 'border-primary/50' : 'border-transparent'}
              focus:outline-none focus:ring-2 focus:ring-primary`}
              onClick={() => onChange(n)}
              aria-label={`Rate ${n}`}
            >
              {n}
            </button>
          )
        })}
      </fieldset>
    </div>
  )
}

export default RatingControl
