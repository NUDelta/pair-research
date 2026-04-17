import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { makePairs } from '@/features/groups/server/tasks'
import { DoubleConfirmDialog } from '@/shared/ui'
import { Button } from '@/shared/ui/button'

interface Props {
  groupId: string
  eligibleTaskCount: number
}

const MakePairsButton = ({ groupId, eligibleTaskCount }: Props) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const makePairsFn = useServerFn(makePairs)
  const isDisabled = eligibleTaskCount < 2 || isPending
  const disabledReason = eligibleTaskCount === 0
    ? 'The pool is empty. At least two active tasks are required to make pairs.'
    : eligibleTaskCount < 2
      ? 'At least two active tasks are required to make pairs.'
      : undefined

  const handleMakePairs = async () => {
    startTransition(async () => {
      const response = await makePairsFn({ data: { groupId } })
      if (response.success) {
        toast.success(response.message)
        await router.invalidate()
      }
      else {
        toast.error(response.message)
      }
    })
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
    />
  )
}

export default MakePairsButton
