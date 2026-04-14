import type { GroupSettingsRole } from '../types'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { bulkManageGroupRoles } from '@/features/groups/server/groups'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'

interface BulkRoleActionDialogProps {
  action: 'merge' | 'remove'
  groupId: string
  onOpenChange: (open: boolean) => void
  open: boolean
  roles: GroupSettingsRole[]
  selectedRoles: GroupSettingsRole[]
}

export default function BulkRoleActionDialog({
  action,
  groupId,
  onOpenChange,
  open,
  roles,
  selectedRoles,
}: BulkRoleActionDialogProps) {
  const router = useRouter()
  const bulkManageGroupRolesFn = useServerFn(bulkManageGroupRoles)
  const [destinationMode, setDestinationMode] = useState<'existing' | 'new'>('existing')
  const [existingRoleId, setExistingRoleId] = useState('')
  const [newRoleTitle, setNewRoleTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const selectedRoleIds = useMemo(() => selectedRoles.map(role => role.id), [selectedRoles])
  const existingTargets = useMemo(
    () => action === 'merge'
      ? roles
      : roles.filter(role => !selectedRoleIds.includes(role.id)),
    [action, roles, selectedRoleIds],
  )
  const resolvedDestinationMode = destinationMode === 'existing' && existingTargets.length === 0
    ? 'new'
    : destinationMode
  const resolvedExistingRoleId = existingTargets.some(role => role.id === existingRoleId)
    ? existingRoleId
    : (existingTargets[0]?.id ?? '')

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDestinationMode(existingTargets.length === 0 ? 'new' : 'existing')
      setExistingRoleId(existingTargets[0]?.id ?? '')
      setNewRoleTitle('')
    }

    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    startTransition(async () => {
      const response = await bulkManageGroupRolesFn({
        data: {
          action,
          groupId,
          roleIds: selectedRoleIds,
          targetRoleId: resolvedDestinationMode === 'existing' ? resolvedExistingRoleId : undefined,
          targetRoleTitle: resolvedDestinationMode === 'new' ? newRoleTitle : undefined,
        },
      })

      if (!response.success) {
        toast.error(response.message)
        return
      }

      toast.success(response.message)
      handleOpenChange(false)
      await router.invalidate()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action === 'merge' ? 'Merge selected roles' : 'Remove selected roles'}</DialogTitle>
          <DialogDescription>
            {action === 'merge'
              ? `Merge ${selectedRoles.length} selected ${selectedRoles.length === 1 ? 'role' : 'roles'} into an existing role or a new destination.`
              : `Remove ${selectedRoles.length} selected ${selectedRoles.length === 1 ? 'role' : 'roles'} and reassign current members before deletion.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Tabs
            value={destinationMode}
            onValueChange={(value) => {
              if (value === 'existing' || value === 'new') {
                setDestinationMode(value)
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing" disabled={existingTargets.length === 0}>
                Existing role
              </TabsTrigger>
              <TabsTrigger value="new">New role</TabsTrigger>
            </TabsList>
          </Tabs>
          {resolvedDestinationMode === 'existing'
            ? (
                <div className="grid gap-2">
                  <Label htmlFor={`${action}-existing-role`}>Destination role</Label>
                  <Select
                    value={resolvedExistingRoleId}
                    onValueChange={setExistingRoleId}
                    disabled={existingTargets.length === 0}
                  >
                    <SelectTrigger id={`${action}-existing-role`}>
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {existingTargets.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )
            : (
                <div className="grid gap-2">
                  <Label htmlFor={`${action}-new-role`}>New role name</Label>
                  <Input
                    id={`${action}-new-role`}
                    value={newRoleTitle}
                    onChange={event => setNewRoleTitle(event.target.value)}
                    placeholder="Enter a role name"
                  />
                </div>
              )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || (resolvedDestinationMode === 'existing'
              ? resolvedExistingRoleId.length === 0
              : newRoleTitle.trim().length === 0)}
          >
            {action === 'merge' ? 'Merge roles' : 'Remove roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
