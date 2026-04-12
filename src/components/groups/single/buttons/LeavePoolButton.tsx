import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { DoubleConfirmDialog } from '@/components/common'
import { Button } from '@/components/ui/button'
import { deleteTask } from '@/lib/actions/task'

interface LeavePoolButtonProps {
  taskId: string
  groupId: string
}

const LeavePoolButton = ({
  taskId,
  groupId,
}: LeavePoolButtonProps) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const deleteTaskFn = useServerFn(deleteTask)

  const handleLeave = async () => {
    startTransition(async () => {
      const { success, message } = await deleteTaskFn({ data: { taskId, groupId } })
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
          variant="outline"
          aria-label="Leave Pool"
          disabled={isPending}
        >
          {isPending ? 'Leaving...' : 'Leave Pool'}
        </Button>
      )}
      title="Leave this current pool?"
      description={'Your submitted task will be deleted, as well as all submitted rating for others tasks.\n Are you sure?'}
      confirmText="Leave"
      cancelText="Cancel"
      onConfirm={handleLeave}
      pendingText="Leaving..."
    />
  )
}

export default LeavePoolButton
