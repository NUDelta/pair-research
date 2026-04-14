import { LoaderCircleIcon } from 'lucide-react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface MemberAccessSelectProps {
  disabled?: boolean
  isAdmin: boolean
  isBusy?: boolean
  isPending: boolean
  memberName: string
  onChange: (nextIsAdmin: boolean) => void
}

export default function MemberAccessSelect({
  disabled = false,
  isAdmin,
  isBusy = false,
  isPending,
  memberName,
  onChange,
}: MemberAccessSelectProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:min-w-[140px]">
      <Select
        value={isAdmin ? 'admin' : 'member'}
        onValueChange={value => onChange(value === 'admin')}
        disabled={disabled || isBusy}
      >
        <SelectTrigger aria-label={`Access for ${memberName}`} className="w-full">
          <SelectValue placeholder="Choose access" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      {isPending && (
        <LoaderCircleIcon className="animate-spin text-muted-foreground" aria-hidden="true" />
      )}
    </div>
  )
}
