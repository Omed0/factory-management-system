'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type Row } from '@tanstack/react-table';
import { Edit, Info, MoreHorizontalIcon, Plus, Receipt, Trash } from 'lucide-react';
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
import { Button, ButtonProps } from '@/components/ui/button';
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
import { formatCurrency } from '@/lib/utils';
import { OneSale } from '@/server/schema/sale';
import InvoiceComponent from './invoice';
import { Printer } from 'lucide-react'
import usePrintById from '@/hooks/usePrintById'

type Props = {
  nameId?: string
} & ButtonProps;

export function ButtonPrint({ nameId = "print", ...props }: Props) {
  const printId = usePrintById()

  return (
    <Button onClick={() => printId(nameId)} {...props}>
      <Printer className="size-5" />
    </Button>
  )
}

export function DataTableRowSaleActions({ row }: { row: Row<OneSale> }) {
  const { searchParams } = useSetQuery();
  const isTrash = searchParams.get('status') === 'trash';

  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const sale = row.original;

  if (!sale) {
    return (
      <Button disabled variant="ghost" className="flex size-8 p-0">
        <MoreHorizontalIcon className="size-4" />
        <span className="sr-only">Open menu</span>
      </Button>
    );
  }

  const isLoan = sale.saleType === 'LOAN';
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
        <CustomDialogWithTrigger
          closeProps={{ className: "bg-accent relative w-fit" }}
          onOpenChange={(e) => {
            if (!e) setDropdownOpen(e)
          }}
          className="md:max-w-[62rem] p-6"
          button={
            <Button className="hover:bg-accent h-9 w-full" variant="link">
              <Receipt className="me-2 size-5" />
              وەصڵ
            </Button>
          }
        >
          <ButtonPrint nameId='print-invoice' className='w-fit' />
          <InvoiceComponent sale={sale} />
        </CustomDialogWithTrigger>
        <DropdownMenuSeparator />
        {isShowInvoiceInfo && (
          <>
            <CustomDialogWithTrigger
              onOpenChange={(e) => {
                if (!e) setDropdownOpen(e)
              }}
              className="w-full p-6 pt-4"
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
  const [open, setOpen] = useState(false);
  const { searchParams } = useSetQuery();
  const {
    data: { dollar },
  } = useDollar();

  const currency = searchParams.get('currency') || 'USD';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-paidLoan-sale', saleId],
    queryFn: async () => await getPaidLoanSaleListActions(saleId),
    enabled: !isTrash && saleId > 0,
  });

  const formatedPrice = (amount: number) => {
    return formatCurrency(amount, dollar, currency);
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

  const totalPeriod = totalAmount - totalRemaining - discount;

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
      <Table className="mt-4 w-full flex-1">
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
            <TableHead className="w-[80px]">ژمارە</TableHead>
            <TableHead>بڕ</TableHead>
            <TableHead>بەروار</TableHead>
            <TableHead className="text-center">تێبینی</TableHead>
            <TableHead className="text-center">سڕینەوە</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loan.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="w-[80px]">{item.id}</TableCell>
              <TableCell className="amount-cell">{formatCurrency(item.amount, dollar, currency)}</TableCell>
              <TableCell>
                {new Date(item.paidDate).toLocaleDateString('en-US')}
              </TableCell>
              <TableCell className="max-w-96 text-wrap text-center">
                {item.note}
              </TableCell>
              <TableCell className="text-center">
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
    </section>
  );
}
