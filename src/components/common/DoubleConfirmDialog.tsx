'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useState } from 'react'
import Spinner from './Spinner'

interface DoubleConfirmDialogProps {
  trigger: React.ReactNode
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  pendingText?: string
  onConfirm: () => Promise<void>
}

const DoubleConfirmDialog = ({
  trigger,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  pendingText = 'Pending...',
  onConfirm,
}: DoubleConfirmDialogProps) => {
  const [pending, setPending] = useState(false)
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    setPending(true)
    await onConfirm()
    setPending(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            <span className="text-left text-base">
              {description.split('\n').map((line, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <span key={idx} className="block">{line}</span>
              ))}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending
              ? <Spinner text={pendingText ?? `${confirmText}...`} />
              : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DoubleConfirmDialog
