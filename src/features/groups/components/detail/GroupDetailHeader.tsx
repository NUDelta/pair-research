import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

interface GroupDetailHeaderProps {
  actions?: ReactNode
  groupName: string
  roundStatusLabel?: string
  roundStatusNote?: string | null
}

export default function GroupDetailHeader({
  actions,
  groupName,
  roundStatusLabel,
  roundStatusNote,
}: GroupDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link to="/groups">
          <ArrowLeftIcon data-icon="inline-start" />
          Back to groups
        </Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight" aria-label="Group title">
              {groupName}
            </h1>
            {roundStatusLabel !== undefined && (
              <Badge variant="secondary" className="text-xs font-medium">
                {roundStatusLabel}
              </Badge>
            )}
          </div>
          {roundStatusNote !== null && roundStatusNote !== undefined && (
            <p className="text-sm text-muted-foreground">{roundStatusNote}</p>
          )}
        </div>

        {actions !== undefined && (
          <div className="flex flex-wrap gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
