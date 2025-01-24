'use client';

import { useState } from 'react';
import { Row } from '@tanstack/react-table';
import { Edit, Info, MoreHorizontalIcon } from 'lucide-react';

import AddEmployee from './add-employee';
import EmployeeInfoActions from './employee-info-actions';

import {
  deleteEmployeeActions,
  forceDeleteEmployeeActions,
  restoreEmployeeActions,
} from '@/actions/employee';
import DeleteModal from '@/components/delete-modal';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import MonthSelector from '@/components/months-selector';
import RestorModal from '@/components/restore-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useSetQuery from '@/hooks/useSetQuery';
import { OneEmployee } from '@/server/schema/employee';

export function DataTableRowActions({ row }: { row: Row<OneEmployee> }) {
  const { searchParams, setQuery } = useSetQuery();
  const isTrash = searchParams.get('status') === 'trash';

  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const rowData = row.original;

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="data-[state=open]:bg-muted flex size-8 p-0"
        >
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="m-2 w-[160px]">
        {isTrash ? (
          <RestorModal
            description="دڵنیای لە هێنانەوەی ئەم کارمەندە"
            restorKey={rowData.id}
            classNameButton="w-full h-9"
            action={restoreEmployeeActions}
            title={`${rowData.name}`}
          />
        ) : (
          <CustomDialogWithTrigger
            open={open}
            onOpenChange={(e) => {
              if (!e) {
                setQuery('', '', ['month', 'currency']);
                setDropdownOpen(false);
              }
              setOpen(e);
            }}
            button={
              <Button
                className="h-9 w-full"
                variant={isTrash ? 'link' : 'ghost'}
              >
                <Edit className="me-2 size-5" />
                گۆڕانکاری
              </Button>
            }
          >
            <section className="w-full p-4">
              <AddEmployee
                handleClose={() => {
                  setOpen(false)
                  setDropdownOpen(false)
                }}
                title="زیادکردن کارمەند"
                employee={{ ...rowData } as OneEmployee}
              />
            </section>
          </CustomDialogWithTrigger>
        )}
        <CustomDialogWithTrigger
          className='md:max-w-4xl'
          onOpenChange={(e) => {
            if (!e) {
              setQuery('', '', ['month']);
              setDropdownOpen(e);
            }
          }}
          button={
            <Button className="h-9 w-full" variant="ghost">
              <Info className="me-2 size-5" />
              زانیاری مووچە
            </Button>
          }
        >
          <section className="w-full p-4">
            <div className="flex w-fit items-center justify-evenly gap-4">
              <Badge
                variant="secondary"
                className="rounded text-lg font-medium"
              >
                {rowData.name}
              </Badge>
              <MonthSelector />
            </div>
            <EmployeeInfoActions employee={rowData} isOpen={dropdownOpen} />
          </section>
        </CustomDialogWithTrigger>
        <DropdownMenuSeparator />
        <DeleteModal
          description={`${isTrash ? 'ئەم کارمەندە بە تەواوی دەسڕێتەوە' : 'دڵنیایی لە ئەرشیفکردنی ئەم کارمەندە'}`}
          submit={isTrash ? forceDeleteEmployeeActions : deleteEmployeeActions}
          onClose={() => setDropdownOpen(false)}
          classNameButton="bg-red-500 text-white w-full h-9"
          title={`${rowData.name}`}
          deleteKey={rowData.id}
          isTrash={isTrash}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
