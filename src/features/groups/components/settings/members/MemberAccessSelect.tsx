import type { GroupPermission } from '@/features/groups/lib/groupPermissions'
import { LoaderCircleIcon } from 'lucide-react'
import { getGroupPermissionLabel, groupPermissionValues } from '@/features/groups/lib/groupPermissions'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface MemberAccessSelectProps {
  availablePermissions?: readonly GroupPermission[]
  disabled?: boolean
  disabledReason?: string | null
  permission: GroupPermission
  isBusy?: boolean
  isPending: boolean
  memberName: string
  onChange: (nextPermission: GroupPermission) => void
}

export default function MemberAccessSelect({
  availablePermissions = groupPermissionValues,
  disabled = false,
  disabledReason = null,
  permission,
  isBusy = false,
  isPending,
  memberName,
  onChange,
}: MemberAccessSelectProps) {
  const permissionOptions = availablePermissions.includes(permission)
    ? availablePermissions
    : [permission, ...availablePermissions]

  return (
    <div className="flex min-w-0 items-center gap-2 sm:min-w-[140px]" title={disabledReason ?? undefined}>
      <Select
        value={permission}
        onValueChange={value => onChange(value as GroupPermission)}
        disabled={disabled || isBusy}
      >
        <SelectTrigger aria-label={`Access for ${memberName}`} className="w-full">
          <SelectValue placeholder="Choose access" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {permissionOptions.map(value => (
              <SelectItem key={value} value={value}>{getGroupPermissionLabel(value)}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {isPending && (
        <LoaderCircleIcon className="animate-spin text-muted-foreground" aria-hidden="true" />
      )}
    </div>
  )
}
