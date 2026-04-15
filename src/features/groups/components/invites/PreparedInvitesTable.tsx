import type { ColumnDef, Row } from '@tanstack/react-table'
import { DataTable } from '@/shared/ui/data-table'

interface PreparedInvitesTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  description: string
  emptyDescription: string
  emptyTitle: string
  filterColumnId?: string
  filterPlaceholder?: string
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
  title?: string
}

export default function PreparedInvitesTable<TData, TValue>({
  columns,
  data,
  description,
  emptyDescription,
  emptyTitle,
  filterColumnId,
  filterPlaceholder = 'Filter invites...',
  getRowId,
  title = 'Prepared invites',
}: PreparedInvitesTableProps<TData, TValue>) {
  return (
    <div className="rounded-xl border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 mb-2">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {data.length > 0
        ? (
            <DataTable
              columns={columns}
              data={data}
              emptyMessage={emptyTitle}
              filterColumnId={filterColumnId}
              filterPlaceholder={filterPlaceholder}
              getRowId={getRowId}
            />
          )
        : (
            <div className="flex flex-col gap-1 px-4 py-8 text-center text-sm text-muted-foreground">
              <p>{emptyTitle}</p>
              <p>{emptyDescription}</p>
            </div>
          )}
    </div>
  )
}
