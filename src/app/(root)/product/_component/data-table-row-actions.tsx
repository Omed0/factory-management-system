'use client';

import { useState } from 'react';
import { Row } from '@tanstack/react-table';
import { Edit, MoreHorizontalIcon } from 'lucide-react';

import AddProduct from './add-product';

import {
  deleteProductActions,
  forceDeleteProductActions,
  restoreProductActions,
} from '@/actions/product';
import DeleteModal from '@/components/delete-modal';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import RestorModal from '@/components/restore-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useSetQuery from '@/hooks/useSetQuery';
import { OneProduct } from '@/server/schema/product';

export function DataTableRowActions({ row }: { row: Row<OneProduct> }) {
  const { searchParams } = useSetQuery();
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
            description="دڵنیای لە هێنانەوەی ئەم مەوادە"
            restorKey={rowData.id}
            classNameButton="w-full h-9"
            action={restoreProductActions}
            title={`${rowData.name}`}
          />
        ) : (
          <CustomDialogWithTrigger
            open={open}
            onOpenChange={(e) => {
              if (!e) setDropdownOpen(false);
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
              <AddProduct
                title="زیادکردنی مەواد"
                product={{ ...rowData } as OneProduct}
                handleClose={() => {
                  setDropdownOpen(false);
                  setOpen(false);
                }}
              />
            </section>
          </CustomDialogWithTrigger>
        )}
        <DropdownMenuSeparator />
        <DeleteModal
          description={`${isTrash ? 'ئەم مەوادە بە تەواوی دەسڕێتەوە' : 'دڵنیایی لە ئەرشیفکردنی ئەم مەوادە'}`}
          submit={isTrash ? forceDeleteProductActions : deleteProductActions}
          classNameButton="bg-red-500 text-white w-full h-9"
          title={`${rowData.name}`}
          deleteKey={rowData.id}
          isTrash={isTrash}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
