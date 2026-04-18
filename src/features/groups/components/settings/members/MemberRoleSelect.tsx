import type { GroupSettingsRole } from '../types'
import { LoaderCircleIcon } from 'lucide-react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface MemberRoleSelectProps {
  disabled?: boolean
  isBusy?: boolean
  isPending: boolean
  memberName: string
  onChange: (value: string) => void
  roles: GroupSettingsRole[]
  value: string
}

export default function MemberRoleSelect({
  disabled = false,
  isBusy = false,
  isPending,
  memberName,
  onChange,
  roles,
  value,
}: MemberRoleSelectProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:min-w-[180px]">
      <Select value={value} onValueChange={onChange} disabled={disabled || isBusy}>
        <SelectTrigger aria-label={`Role for ${memberName}`} className="w-full">
          <SelectValue placeholder="Choose a role" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id} disabled={role.isOptimistic === true}>
                {role.title}
              </SelectItem>
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
