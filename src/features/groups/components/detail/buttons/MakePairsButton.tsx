import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { toast } from 'sonner'
import { makePairs } from '@/features/groups/server/tasks'
import { DoubleConfirmDialog } from '@/shared/ui'
import { Button } from '@/shared/ui/button'

interface Props {
  groupId: string
  eligibleTaskCount: number
}

const MakePairsButton = ({ groupId, eligibleTaskCount }: Props) => {
  const [isPending, setIsPending] = useState(false)
  const makePairsFn = useServerFn(makePairs)
  const isDisabled = eligibleTaskCount < 2 || isPending
  const disabledReason = eligibleTaskCount === 0
    ? 'The pool is empty. At least two active tasks are required to make pairs.'
    : eligibleTaskCount < 2
      ? 'At least two active tasks are required to make pairs.'
      : undefined

  const handleMakePairs = async () => {
    if (isPending) {
      return
    }

    setIsPending(true)

    try {
      const response = await makePairsFn({ data: { groupId } })
      if (!response.success) {
        toast.error(response.message)
      }
    }
    catch (error) {
      console.error(error)
      toast.error('Failed to make pairs. Please try again.')
    }
    finally {
      setIsPending(false)
    }
  }

  return (
    <DoubleConfirmDialog
      trigger={(
        <Button
          disabled={isDisabled}
          aria-busy={isPending}
          aria-label="Make Pairs"
          title={isDisabled ? disabledReason : undefined}
        >
          {isPending ? 'Making pairs...' : 'Make Pairs'}
        </Button>
      )}
      title="Make Pairs"
      description="Are you sure you want to make pairs? This will create pairs of tasks that will be able to help each other."
      confirmText="Make Pairs"
      cancelText="Cancel"
      onConfirm={handleMakePairs}
      pendingText="Making pairs..."
    />
  )
}

export default MakePairsButton
