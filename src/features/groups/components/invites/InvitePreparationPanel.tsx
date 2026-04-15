import type { ReactNode } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

interface InvitePreparationPanelProps {
  actionButtons: ReactNode
  count: number
  description: ReactNode
  label: string
  maxInvites: number
  onSourceChange: (value: string) => void
  placeholder: string
  sourceId: string
  sourceValue: string
}

export default function InvitePreparationPanel({
  actionButtons,
  count,
  description,
  label,
  maxInvites,
  onSourceChange,
  placeholder,
  sourceId,
  sourceValue,
}: InvitePreparationPanelProps) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Label htmlFor={sourceId}>{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary">
          {count}
          /
          {maxInvites}
          {' '}
          prepared
        </Badge>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <Textarea
          id={sourceId}
          value={sourceValue}
          onChange={event => onSourceChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-28"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          {actionButtons}
        </div>
      </div>
    </div>
  )
}
