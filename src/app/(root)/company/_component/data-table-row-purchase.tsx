'use client';

import { useState } from 'react';
import { type Row } from '@tanstack/react-table';
import { Edit, Info, MoreHorizontalIcon, Plus, Trash } from 'lucide-react';
import { toast } from 'sonner';

import { usePurchaseInfo } from '../purchase-info-state';
import AddPurchase from './add-purchase-form';
import AddCompanyPurchaseInfo from './add-purchase-info-form';

import {
  deleteCompanyPurchaseActions,
  deleteCompanyPurchaseInfoActions,
  forceDeleteCompanyPurchaseActions,
  restoreCompanyPurchaseActions,
} from '@/actions/company';
import DeleteModal from '@/components/delete-modal';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import RestorModal from '@/components/restore-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import useSetQuery from '@/hooks/useSetQuery';
import { OneCompanyPurchase } from '@/server/schema/company';

export function DataTableRowPurchaseActions({
  row,
}: {
  row: Row<OneCompanyPurchase>;
}) {
  const { searchParams } = useSetQuery();
  const isTrash = searchParams.get('status') === 'trash';

  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const rowData = row.original;

  const isLoan = rowData.type === 'LOAN';
  const isFinish = rowData.totalAmount === rowData.totalRemaining;
  const isShowInvoiceInfo = isLoan && !isTrash;

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
        {isShowInvoiceInfo && (
          <>
            <CustomDialogWithTrigger
              onOpenChange={(e) => !e && setDropdownOpen(e)}
              className="w-full p-6 pt-4"
              button={
                <Button className="hover:bg-accent h-9 w-full" variant="link">
                  <Info className="me-2 size-5" />
                  زانیاری وەصڵ
                </Button>
              }
            >
              <ModalTablePurchaseInfo
                companyPurchaseId={rowData.id}
                isTrash={isTrash}
              />
            </CustomDialogWithTrigger>
            <DropdownMenuSeparator />
          </>
        )}
        {isTrash ? (
          <RestorModal
            description="دڵنیای لە هێنانەوەی ئەم کۆمپانیایە"
            restorKey={rowData.id}
            classNameButton="w-full h-9"
            action={(id) =>
              restoreCompanyPurchaseActions(id, rowData.companyId)
            }
            title={`${rowData.name}`}
          />
        ) : (
          <CustomDialogWithTrigger
            open={open}
            onOpenChange={(e) => {
              if (isFinish) return;
              if (!e) setDropdownOpen(false);
              setOpen(e);
            }}
            button={
              <Button
                disabled={isFinish}
                className="h-9 w-full"
                variant={isTrash ? 'link' : 'ghost'}
              >
                <Edit className="me-2 size-5" />
                گۆڕانکاری
              </Button>
            }
          >
            <section className="w-full p-4">
              <AddPurchase
                title="زیادکردنی کڕین"
                purchase={{ ...rowData } as OneCompanyPurchase}
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
          description={`${isTrash ? 'ئەم داتایە بە تەواوی دەسڕێتەوە' : 'دڵنیایی لە ئەرشیفکردنی ئەم داتایە'}`}
          submit={
            isTrash
              ? (id) => forceDeleteCompanyPurchaseActions(id, rowData.companyId)
              : (id) => deleteCompanyPurchaseActions(id, rowData.companyId)
          }
          classNameButton="bg-red-500 text-white w-full h-9"
          onClose={() => setDropdownOpen(false)}
          title={`${rowData.name}`}
          deleteKey={rowData.id}
          isTrash={isTrash}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ModalTablePurchaseInfo<T extends number>({
  companyPurchaseId,
  isTrash,
}: {
  companyPurchaseId: T;
  isTrash: boolean;
}) {
  const [open, setOpen] = useState(false);

  const { isLoading, data, isError, error, refetch } = usePurchaseInfo(
    companyPurchaseId,
    isTrash
  );

  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (isError || !data || isTrash) {
    return (
      <div className="p-4 text-center text-red-500">
        {error?.message || 'وەصڵی سڕاوە داتای پشان نادرێت'}
      </div>
    );
  }

  const { purchaseInfo, purchase } = data;
  const totalPeriod =
    (purchase.totalAmount ?? 0) - (purchase.totalRemaining ?? 0);
  const isFinish = purchase.totalAmount === purchase.totalRemaining;
  const totalInfo = [
    { title: 'کۆی قەرز', value: purchase.totalAmount ?? 0 },
    { title: 'کۆی دراوە', value: purchase.totalRemaining ?? 0 },
    { title: 'قەرزی ماوە', value: isNaN(totalPeriod) ? 0 : totalPeriod },
  ];

  return (
    <section className="flex-1">
      {!isFinish && (
        <CustomDialogWithTrigger
          className="p-4"
          button={
            <Button disabled={isFinish}>
              <Plus className="me-2 size-5" />
              زیادکردن
            </Button>
          }
          open={open}
          onOpenChange={setOpen}
        >
          <AddCompanyPurchaseInfo
            companyPurchaseId={companyPurchaseId}
            amountPeriod={totalPeriod}
            title="زیادکردنی قیست"
            handleClose={() => {
              refetch();
              setOpen(false);
            }}
          />
        </CustomDialogWithTrigger>
      )}
      <Table className="mt-4 w-full flex-1">
        <TableCaption className="my-6">
          <div className="flex w-full flex-wrap items-center justify-center gap-4">
            {totalInfo.map((item) => (
              <div key={item.title}>
                <span className="text-sm">{item.title}:</span>
                <Badge variant="secondary">{item.value}</Badge>
              </div>
            ))}
          </div>
        </TableCaption>
        <TableCaption>
          {purchaseInfo.length === 0
            ? 'هیچ قیستێک نەدراوەتەوە'
            : `${
                purchaseInfo.length === 1
                  ? 'تەنها پێشەکی دراوە'
                  : `${purchaseInfo.length} جار پارە دراوە`
              }`}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ژمارە</TableHead>
            <TableHead>بڕ</TableHead>
            <TableHead>بەروار</TableHead>
            <TableHead className="text-center">تێبینی</TableHead>
            <TableHead className="text-center">سڕینەوە</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseInfo.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="w-[80px]">
                {item.id === 1 ? 'پێشەکی' : `${item.id}`}
              </TableCell>
              <TableCell>{item.amount}</TableCell>
              <TableCell>
                {new Date(item.date).toLocaleDateString('en-US')}
              </TableCell>
              <TableCell className="max-w-96 text-wrap text-center">
                {item.note}
              </TableCell>
              <TableCell className="text-center">
                <form
                  id="deletePurchaseInfo"
                  action={async () => {
                    const { success, message } =
                      await deleteCompanyPurchaseInfoActions(
                        item.id,
                        companyPurchaseId
                      );
                    if (success) {
                      toast.success(message);
                      refetch();
                      setOpen(false);
                    } else toast.error(message);
                  }}
                >
                  <Button
                    form="deletePurchaseInfo"
                    variant="destructive"
                    className="size-7"
                    size="icon"
                  >
                    <Trash />
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
