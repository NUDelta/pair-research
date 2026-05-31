import type { GroupPermission } from '@/features/groups/lib/groupPermissions'
import { LoaderCircleIcon } from 'lucide-react'
import { getGroupPermissionLabel, groupPermissionValues } from '@/features/groups/lib/groupPermissions'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface MemberAccessSelectProps {
  disabled?: boolean
  permission: GroupPermission
  isBusy?: boolean
  isPending: boolean
  memberName: string
  onChange: (nextPermission: GroupPermission) => void
}

export default function MemberAccessSelect({
  disabled = false,
  permission,
  isBusy = false,
  isPending,
  memberName,
  onChange,
}: MemberAccessSelectProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:min-w-[140px]">
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
            {groupPermissionValues.map(value => (
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
