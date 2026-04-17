import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { resetPool } from '@/features/groups/server/tasks'
import { DoubleConfirmDialog } from '@/shared/ui'
import { Button } from '@/shared/ui/button'

interface ResetPoolButtonProps {
  groupId: string
}

const ResetPoolButton = ({ groupId }: ResetPoolButtonProps) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const resetPoolFn = useServerFn(resetPool)

  const handleReset = async () => {
    startTransition(async () => {
      const { success, message } = await resetPoolFn({ data: { groupId } })
      if (success) {
        toast.success(message)
        await router.invalidate()
      }
      else {
        toast.error(message)
      }
    })
  }

  return (
    <DoubleConfirmDialog
      trigger={(
        <Button
          variant="destructive"
          aria-label="Reset Pool"
          disabled={isPending}
        >
          {isPending ? 'Resetting...' : 'Reset Pool'}
        </Button>
      )}
      title="Reset the current pool?"
      description="This will end the current round, clear its paired tasks and ratings, and prepare the group for a fresh pool."
      confirmText="Reset Pool"
      cancelText="Cancel"
      onConfirm={handleReset}
      pendingText="Resetting..."
    />
  )
}

export default ResetPoolButton
