'use client';

import { useRef, useState } from 'react';
import { type Row } from '@tanstack/react-table';
import { Edit, Info, MoreHorizontalIcon, Plus, Printer, Receipt, Trash } from 'lucide-react';
import { toast } from 'sonner';

import AddPaidLoanSale from './add-loan-sale-form';
import FormSaleForCustomer from './add-sale-form';

import {
  deletePaidLoanSaleListActions,
  deleteSaleForCustomerActions,
  forceDeleteSaleForCustomerActions,
  getPaidLoanSaleListActions,
  restoreSaleForCustomerActions,
} from '@/actions/sale';
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
import { useDollar } from '@/hooks/useDollar';
import useSetQuery from '@/hooks/useSetQuery';
import { formatCurrency, parseDate } from '@/lib/utils';
import { OneSale } from '@/server/schema/sale';
import { useReactToPrint } from "react-to-print"
import InvoiceComponent from './invoice';
import { useLoanInfo, useInvoiceData } from '../[id]/useInvoiceData';
import { now } from '@/lib/constant';


export function DataTableRowSaleActions({ row }: { row: Row<OneSale> }) {
  const { searchParams } = useSetQuery();
  const isTrash = searchParams.get('status') === 'trash';

  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const contentRef = useRef(null)
  const handlePrint = useReactToPrint({ contentRef });

  const sale = row.original;
  const { refetch } = useInvoiceData({ sale })
  const { refetch: fetchLoan } = useLoanInfo({ saleId: sale.id, isTrash });

  const isLoan = sale?.saleType === 'LOAN';
  const isShowInvoiceInfo = isLoan && !isTrash;

  if (!sale) {
    return (
      <Button disabled variant="ghost" className="flex size-8 p-0">
        <MoreHorizontalIcon className="size-4" />
        <span className="sr-only">Open menu</span>
      </Button>
    );
  }

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
        {!isTrash && (
          <>
            <CustomDialogWithTrigger
              closeProps={{ className: "bg-accent w-fit p-1.5" }}
              onOpenChange={(e) => {
                if (!e) {
                  setDropdownOpen(e)
                } else {
                  refetch()
                }
              }}
              className="md:max-w-4xl p-4"
              button={
                <Button className="hover:bg-accent h-9 w-full" variant="link">
                  <Receipt className="me-2 size-5" />
                  وەصڵ
                </Button>
              }
            >
              <Button
                className="w-fit"
                size="sm"
                onClick={() => handlePrint()}
              >
                <Printer className="size-5" />
              </Button>
              <InvoiceComponent sale={sale} ref={contentRef} />
            </CustomDialogWithTrigger>
            <DropdownMenuSeparator />
          </>
        )}
        {isShowInvoiceInfo && (
          <>
            <CustomDialogWithTrigger
              onOpenChange={(e) => {
                if (!e) {
                  setDropdownOpen(e)
                } else {
                  fetchLoan()
                }
              }}
              className="w-full md:max-w-4xl p-6 pt-4"
              button={
                <Button className="hover:bg-accent h-9 w-full" variant="link">
                  <Info className="me-2 size-5" />
                  زانیاری قیست
                </Button>
              }
            >
              <ModalTablePaidLoanSale saleId={sale.id} isTrash={isTrash} />
            </CustomDialogWithTrigger>
            <DropdownMenuSeparator />
          </>
        )}
        {isTrash ? (
          <RestorModal
            description="دڵنیای لە هێنانەوەی ئەم وەصڵە"
            restorKey={sale.id}
            classNameButton="w-full h-9"
            action={(id) => restoreSaleForCustomerActions(id, sale.customerId!)}
            title={`${sale.saleNumber}`}
          />
        ) : (
          <CustomDialogWithTrigger
            open={open}
            onOpenChange={(e) => {
              if (isTrash) return;
              if (!e) setDropdownOpen(false);
              setOpen(e);
            }}
            button={
              <Button
                disabled={isTrash}
                className="h-9 w-full"
                variant={isTrash ? 'link' : 'ghost'}
              >
                <Edit className="me-2 size-5" />
                گۆڕانکاری
              </Button>
            }
          >
            <section className="w-full p-4">
              <FormSaleForCustomer
                customerName={sale.saleNumber}
                customerId={sale.customerId!}
                title="گۆڕانکاری لە وەصڵ"
                sale={{ ...sale }}
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
          description={`${isTrash ? 'ئەم وەصڵە بە تەواوی دەسڕێتەوە' : 'دڵنیایی لە ئەرشیفکردنی ئەم وەصڵە'}`}
          submit={(id) =>
            isTrash
              ? forceDeleteSaleForCustomerActions(id, sale.customerId!)
              : deleteSaleForCustomerActions(id, sale.customerId!)
          }
          classNameButton="bg-red-500 text-white w-full h-9"
          title={`${sale.saleNumber}`}
          onClose={() => setDropdownOpen(false)}
          deleteKey={sale.id}
          isTrash={isTrash}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ModalTablePaidLoanSale({
  saleId,
  isTrash,
}: {
  saleId: number;
  isTrash: boolean;
}) {
  const contentRef = useRef(null)
  const [open, setOpen] = useState(false);
  const { searchParams } = useSetQuery();
  const {
    data: { dollar },
  } = useDollar();

  const currency = searchParams.get('currency') || 'USD';

  const handlePrint = useReactToPrint({ contentRef });
  const { data, isLoading, isError, error, refetch } = useLoanInfo({ saleId, isTrash });

  const dollarValue = data?.data?.sale.dollar || dollar
  const formatedPrice = (amount: number) => {
    return formatCurrency(amount, dollarValue, currency);
  };

  if (isLoading) return <div className="p-4 text-center">چاوەڕوانبە ...</div>;
  if (isError || !data?.success || isTrash || !data.data) {
    return (
      <div className="p-4 text-center text-red-500">
        {error?.message || data?.message || 'وەصڵی سڕاوە داتای پشان نادرێت'}
      </div>
    );
  }

  const { loan, sale } = data.data;
  const { totalAmount, totalRemaining, discount } = sale

  const totalPeriod = (totalAmount - discount) - totalRemaining;

  const isFinished = totalPeriod === 0 && totalAmount > 0; //cannot add other paidLoan until have different value total and remainig

  const totalInfo = [
    {
      title: 'کۆی قەرز',
      value: formatedPrice(totalAmount),
      valueWithDiscount: formatedPrice(totalAmount - discount),
    },
    {
      title: 'کۆی دراوە',
      value: formatedPrice(totalRemaining),
    },
    {
      title: 'قەرزی ماوە',
      value: formatedPrice(totalPeriod),
    },
  ];

  return (
    <section className="flex-1">
      {!isFinished && (
        <CustomDialogWithTrigger
          open={open}
          onOpenChange={(e) => {
            if (e) refetch();
            setOpen(e);
          }}
          className="p-4"
          button={
            <Button disabled={isFinished}>
              <Plus className="me-2 size-5" />
              زیادکردن
            </Button>
          }
        >
          <AddPaidLoanSale
            saleId={sale.id}
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
        className="ms-2"
        variant="outline"
        size="icon"
        onClick={() => handlePrint()}
      >
        <Printer className="size-5" />
      </Button>
      <div className='my-2 mt-5' ref={contentRef}>
        <div className='flex items-center gap-2 justify-between'>
          <h2 className='text-2xl font-medium'>وەصڵی قەرز</h2>
          <p>{now.toLocaleString()}</p>
        </div>
        <Table className="mt-4 w-full flex-1 border">
          <TableCaption className="my-6">
            <div className="flex w-full flex-wrap items-center justify-center gap-4">
              {totalInfo.map((item) => (
                <div key={item.title} className="flex items-center">
                  <span className="text-sm">{item.title}:</span>
                  <Badge variant="secondary">
                    {item.valueWithDiscount !== undefined && sale.discount > 0 ? (
                      <div>
                        <del className="text-red-500">{item.value}</del>
                        <span className="block">{item.valueWithDiscount}</span>
                      </div>
                    ) : (
                      <span>{item.value}</span>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </TableCaption>
          <TableCaption>
            {isFinished
              ? 'تەواوبووە'
              : loan.length === 0
                ? 'هیچ قیستێک نەدراوەتەوە'
                : `${loan.length} جار پارە دراوە`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 border-x">ژمارە</TableHead>
              <TableHead className='text-center border-x w-24'>بڕ</TableHead>
              <TableHead className='text-center border-x w-24'>بەروار</TableHead>
              <TableHead className="text-center border-x">تێبینی</TableHead>
              <TableHead className="text-end border-x w-16 hide-on-print">سڕینەوە</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loan.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="w-20 text-center">{item.id}</TableCell>
                <TableCell className="amount-cell text-center">{formatCurrency(item.amount, dollarValue, currency)}</TableCell>
                <TableCell className='text-center'>
                  {parseDate(item.paidDate)}
                </TableCell>
                <TableCell className="max-w-96 text-wrap text-center">
                  {item.note}
                </TableCell>
                <TableCell className="text-end hide-on-print">
                  <form
                    id="deletePurchaseInfo"
                    action={async () => {
                      const { success, message } =
                        await deletePaidLoanSaleListActions(item.id, sale.id);
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
