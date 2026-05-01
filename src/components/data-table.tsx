import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '~/components/ui/table';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function DataTable<T>({
  data,
  columns,
  searchKey,
  searchPlaceholder = 'Search...',
  pageSize = 20,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination: { pageIndex: 0, pageSize: currentPageSize } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  const handlePageSizeChange = (val: string) => {
    setCurrentPageSize(Number(val));
    table.setPageSize(Number(val));
    table.setPageIndex(0);
  };

  const filteredCount = table.getFilteredRowModel().rows.length;
  const totalPages = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="space-y-3">
      {/* Search + page size */}
      <div className="flex items-center justify-between gap-3">
        {searchKey ? (
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs"
          />
        ) : <div />}

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
          <Select value={String(currentPageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-17.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button
                        className="inline-flex items-center gap-1 hover:underline"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((c) => (
                    <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground py-8">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: count + page nav */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filteredCount} row{filteredCount !== 1 ? 's' : ''}
          {totalPages > 1 && ` · page ${currentPage} / ${totalPages}`}
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
