import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { DoubleConfirmDialog } from '@/components/common'
import { Button } from '@/components/ui/button'
import { makePairs } from '@/lib/actions/task'

interface Props {
  groupId: string
}

const MakePairsButton = ({ groupId }: Props) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const makePairsFn = useServerFn(makePairs)

  const handleMakePairs = async () => {
    startTransition(async () => {
      const response = await makePairsFn({ data: { groupId } })
      if (response.success) {
        toast.success(response.message)
        await router.invalidate()
      }
      else {
        if (response.data?.missingHelpCapacities) {
          // Show missing help capacities in the confirmation dialog
          const missingCount = response.data.missingHelpCapacities.length
          const missingDetails = response.data.missingHelpCapacities
            .map(m => `${m.userName} hasn't set help capacity for "${m.taskDescription}"`)
            .join('\n')

          toast.error(
            <div>
              <p>
                There are
                {missingCount}
                {' '}
                missing help capacities:
              </p>
              <pre className="mt-2 whitespace-pre-wrap text-sm">{missingDetails}</pre>
              <p className="mt-2">Do you want to proceed anyway?</p>
            </div>,
            {
              duration: 10000,
              action: {
                label: 'Proceed',
                onClick: async () => handleMakePairs(),
              },
            },
          )
        }
        else {
          toast.error(response.message)
        }
      }
    })
  }

  return (
    <DoubleConfirmDialog
      trigger={(
        <Button
          disabled={isPending}
          aria-busy={isPending}
          aria-label="Make Pairs"
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
