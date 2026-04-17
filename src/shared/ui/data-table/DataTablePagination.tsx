import type { Table } from '@tanstack/react-table'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const pageSizeOptions = ['10', '20', '30', '50']

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const pageCount = Math.max(table.getPageCount(), 1)

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length}
        {' '}
        of
        {' '}
        {table.getFilteredRowModel().rows.length}
        {' '}
        row(s) selected
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="w-22">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pageSizeOptions.map(pageSize => (
                  <SelectItem key={pageSize} value={pageSize}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="min-w-28 text-sm font-medium">
            Page
            {' '}
            {table.getState().pagination.pageIndex + 1}
            {' '}
            of
            {' '}
            {pageCount}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to first page"
            >
              <ChevronsLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to previous page"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to next page"
            >
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to last page"
            >
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
