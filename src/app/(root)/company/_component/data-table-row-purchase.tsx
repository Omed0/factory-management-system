'use client';

import { useRef, useState } from 'react';
import { type Row } from '@tanstack/react-table';
import { Edit, Info, MoreHorizontalIcon, Plus, Printer, Trash } from 'lucide-react';
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
import { formatCurrency, parseDate } from '@/lib/utils';
import { useDollar } from '@/hooks/useDollar';
import { now } from '@/lib/constant';
import usePrint from '@/hooks/use-print';

export function DataTableRowPurchaseActions({
  row,
}: {
  row: Row<OneCompanyPurchase>;
}) {
  const { searchParams } = useSetQuery();
  const isTrash = searchParams.get('status') === 'trash';

  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { companyId, id, name, type, company } = row.original;

  const isLoan = type === 'LOAN';
  //const isFinish = totalAmount === totalRemaining;
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
              className="w-full p-6 pt-4 md:max-w-4xl"
              button={
                <Button className="hover:bg-accent h-9 w-full" variant="link">
                  <Info className="me-2 size-5" />
                  زانیاری وەصڵ
                </Button>
              }
            >
              <ModalTablePurchaseInfo
                company={company?.name || ''}
                companyPurchaseId={id}
                isTrash={isTrash}
              />
            </CustomDialogWithTrigger>
            <DropdownMenuSeparator />
          </>
        )}
        {isTrash ? (
          <RestorModal
            description="دڵنیای لە هێنانەوەی ئەم کۆمپانیایە"
            restorKey={id}
            classNameButton="w-full h-9"
            action={(id) => restoreCompanyPurchaseActions(id, companyId)}
            title={`${name}`}
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
              <AddPurchase
                title="زیادکردنی کڕین"
                purchase={{ ...row.original } as OneCompanyPurchase}
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
              ? (id) => forceDeleteCompanyPurchaseActions(id, companyId)
              : (id) => deleteCompanyPurchaseActions(id, companyId)
          }
          classNameButton="bg-red-500 text-white w-full h-9"
          onClose={() => setDropdownOpen(false)}
          title={`${name}`}
          deleteKey={id}
          isTrash={isTrash}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ModalTablePurchaseInfo<T extends number>({
  company,
  companyPurchaseId,
  isTrash,
}: {
  company: string;
  companyPurchaseId: T;
  isTrash: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { searchParams } = useSetQuery()
  const { data: { dollar } } = useDollar()
  const currency = searchParams.get("currency") || "USD"

  const contentRef = useRef(null)
  const handlePrint = usePrint({ contentRef })

  const { isLoading, data, isError, error, refetch } = usePurchaseInfo(
    companyPurchaseId,
    isTrash
  );

  function formatAmount(amount: number) {
    return formatCurrency(amount, data?.purchase.dollar || dollar, currency)
  }

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
    (purchase.totalAmount || 0) - (purchase.totalRemaining || 0);
  const isFinish = purchase.totalAmount === purchase.totalRemaining;
  const totalInfo = [
    { title: 'کۆی قەرز', value: formatAmount(purchase.totalAmount || 0) },
    { title: 'کۆی دراوە', value: formatAmount(purchase.totalRemaining || 0) },
    { title: 'قەرزی ماوە', value: isNaN(totalPeriod) ? 0 : formatAmount(totalPeriod) },
  ];

  return (
    <section className="flex-1">
      {!isFinish && (
        <CustomDialogWithTrigger
          open={open}
          onOpenChange={setOpen}
          className="p-4"
          button={
            <Button disabled={isFinish}>
              <Plus className="me-2 size-5" />
              زیادکردن
            </Button>
          }
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
      <Button
        className="w-fit ms-3"
        variant="outline"
        onClick={() => handlePrint()}
      >
        <Printer className="size-5" />
      </Button>
      <div ref={contentRef} className='my-2 mt-5'>
        <div className='flex items-center gap-2 justify-between text-2xl font-bold'>
          <h1 className="text-primary">زانیار گرووپ</h1>
          <h2 className='capitalize'>فرۆشیار : {company}</h2>
        </div>
        <div className='flex items-center gap-2 justify-between my-1'>
          <h2 className='text-lg font-medium'>وەصڵی قەرز</h2>
          <p>{now.toLocaleString()}</p>
        </div>
        <Table className="mt-4 w-full flex-1 border">
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
              : `${isFinish
                ? 'تەواو بووە'
                : `${purchaseInfo.length} جار پارە دراوە`
              }`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="border-x text-center px-2 h-9 w-24">زنجیرە</TableHead>
              <TableHead className='border-x text-center px-2 h-9 w-24'>بڕ</TableHead>
              <TableHead className='border-x text-center px-2 h-9 w-24'>بەروار</TableHead>
              <TableHead className="border-x text-center px-2 h-9">تێبینی</TableHead>
              <TableHead className="border-x text-center px-2 h-9 w-20 hide-on-print">سڕینەوە</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseInfo.map((item, i) => (
              <TableRow key={item.id}>
                <TableCell className="p-2 text-center">
                  {i + 1}
                </TableCell>
                <TableCell className='p-2 text-center'>{formatAmount(item.amount)}</TableCell>
                <TableCell className='p-2 text-center'>
                  {parseDate(item.date)}
                </TableCell>
                <TableCell className="p-2 max-w-96 text-wrap text-center">
                  {item.note}
                </TableCell>
                <TableCell className="p-2 text-center hide-on-print">
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
      </div>
    </section>
  );
}
