import type { ApplyGroupSettingsOptimisticUpdate } from '../optimisticGroupSettings'
import type { GroupSettingsRole } from '../types'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Trash2Icon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteGroupRole } from '@/features/groups/server/groups/deleteGroupRole'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { applyRoleDelete } from '../optimisticGroupSettings'

interface DeleteGroupRoleDialogProps {
  assignedMemberCount: number
  applyOptimisticUpdate: ApplyGroupSettingsOptimisticUpdate
  groupId: string
  role: GroupSettingsRole
  roles: GroupSettingsRole[]
}

export default function DeleteGroupRoleDialog({
  assignedMemberCount,
  applyOptimisticUpdate,
  groupId,
  role,
  roles,
}: DeleteGroupRoleDialogProps) {
  const router = useRouter()
  const deleteGroupRoleFn = useServerFn(deleteGroupRole)
  const alternativeRoles = roles.filter(candidateRole => candidateRole.id !== role.id && candidateRole.isOptimistic !== true)
  const [open, setOpen] = useState(false)
  const [replacementRoleId, setReplacementRoleId] = useState(alternativeRoles[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const requiresReplacement = assignedMemberCount > 0
  const cannotDeleteLastRole = roles.filter(candidateRole => candidateRole.isOptimistic !== true).length <= 1

  const handleDelete = () => {
    const rollback = applyOptimisticUpdate((draft) => {
      applyRoleDelete(draft, {
        roleId: role.id,
        replacementRoleId: requiresReplacement ? replacementRoleId : undefined,
      })
    })

    setOpen(false)

    startTransition(async () => {
      const response = await deleteGroupRoleFn({
        data: {
          groupId,
          roleId: role.id,
          replacementRoleId: requiresReplacement ? replacementRoleId : undefined,
        },
      })

      if (!response.success) {
        rollback()
        toast.error(response.message)
        return
      }

      toast.success(response.message)
      void router.invalidate()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={cannotDeleteLastRole || role.isOptimistic === true}
          title={cannotDeleteLastRole ? 'Create another role before deleting the last remaining role.' : undefined}
        >
          <Trash2Icon data-icon="inline-start" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete role</DialogTitle>
          <DialogDescription>
            {requiresReplacement
              ? `This role is still assigned to ${assignedMemberCount} ${assignedMemberCount === 1 ? 'member' : 'members'}. Choose a replacement before deleting it.`
              : 'This role is not assigned to any members and can be deleted immediately.'}
          </DialogDescription>
        </DialogHeader>
        {requiresReplacement && (
          <div className="grid gap-2">
            <Label htmlFor={`replacement-role-${role.id}`}>Replacement role</Label>
            <Select value={replacementRoleId} onValueChange={setReplacementRoleId}>
              <SelectTrigger id={`replacement-role-${role.id}`} className="w-full">
                <SelectValue placeholder="Choose a replacement role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {alternativeRoles.map(alternativeRole => (
                    <SelectItem key={alternativeRole.id} value={alternativeRole.id}>
                      {alternativeRole.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || (requiresReplacement && replacementRoleId.length === 0)}
          >
            {isPending ? <Spinner text="Deleting role..." /> : 'Delete role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
