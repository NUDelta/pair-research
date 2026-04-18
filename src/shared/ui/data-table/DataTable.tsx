import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
  Table as TanStackTable,
  VisibilityState,
} from '@tanstack/react-table'
import type { ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import { Input } from '@/shared/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { DataTablePagination } from './DataTablePagination'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyMessage: string
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  filterColumnId?: string
  filterPlaceholder?: string
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
  renderToolbar?: (table: TanStackTable<TData>) => ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage,
  enableRowSelection = true,
  filterColumnId,
  filterPlaceholder = 'Filter rows...',
  getRowId,
  renderToolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    enableRowSelection,
    getRowId,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: true,
    state: {
      columnFilters,
      columnVisibility,
      pagination,
      rowSelection,
      sorting,
    },
  })

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        {filterColumnId === undefined
          ? <div />
          : (
              <Input
                value={(table.getColumn(filterColumnId)?.getFilterValue() as string | undefined) ?? ''}
                onChange={event => table.getColumn(filterColumnId)?.setFilterValue(event.target.value)}
                placeholder={filterPlaceholder}
                className="w-full sm:max-w-sm"
              />
            )}
        {renderToolbar !== undefined && (
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            {renderToolbar(table)}
          </div>
        )}
      </div>
      <div className="border-y">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0
              ? table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
