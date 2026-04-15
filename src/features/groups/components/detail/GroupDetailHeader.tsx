import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface GroupDetailHeaderProps {
  actions?: ReactNode
  groupName: string
}

export default function GroupDetailHeader({
  actions,
  groupName,
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
        <h1 className="text-3xl font-semibold tracking-tight" aria-label="Group title">
          {groupName}
        </h1>

        {actions !== undefined && (
          <div className="flex flex-wrap gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
