import type { Column } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <span>{title}</span>
  }

  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc'
    ? ArrowUpIcon
    : sorted === 'desc'
      ? ArrowDownIcon
      : ArrowUpDownIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          aria-label={`Column options for ${title}`}
        >
          <span>{title}</span>
          <Icon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          {column.getCanSort() && (
            <>
              <DropdownMenuItem onSelect={() => column.toggleSorting(false)}>
                <ArrowUpIcon data-icon="inline-start" />
                Asc
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => column.toggleSorting(true)}>
                <ArrowDownIcon data-icon="inline-start" />
                Desc
              </DropdownMenuItem>
            </>
          )}
          {column.getCanHide() && (
            <DropdownMenuItem onSelect={() => column.toggleVisibility(false)}>
              <EyeOffIcon data-icon="inline-start" />
              Hide column
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
