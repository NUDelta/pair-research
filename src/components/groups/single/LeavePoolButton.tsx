'use client'

import DoubleConfirmDialog from '@/components/common/DoubleConfirmDialog'
import { Button } from '@/components/ui/button'
import { deleteTask } from '@/lib/actions/task'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

const LeavePoolButton = ({ taskId }: { taskId: string }) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleLeave = async () => {
    startTransition(async () => {
      const { success, message } = await deleteTask(taskId)
      if (success) {
        toast.success(message)
        router.refresh()
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
