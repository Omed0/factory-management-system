'use client';

import { useCallback, useMemo, useTransition } from 'react';
import { Calculator, CheckCheck, Minus, Plus, Trash } from 'lucide-react';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';

import {
  decreaseProductQuantityActions,
  deleteProductEntrlyActions,
  discountSaleActions,
  finishSaleActions,
  getCustomerListSaleActions,
  getProductSaleListActions,
  increaseProductQuantityActions,
} from '@/actions/sale';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDollar } from '@/hooks/useDollar';
import useSetQuery from '@/hooks/useSetQuery';
import { debounce, formatCurrency } from '@/lib/utils';
import { OneSale } from '@/server/schema/sale';
import BackButton from '@/components/layout/back-button';

type Props = {
  saleWithProduct: Awaited<
    ReturnType<typeof getProductSaleListActions>
  >['SaleWithProducts'];
  sales: Awaited<ReturnType<typeof getCustomerListSaleActions>>['data'];
};

export default function SaleInvoice({ saleWithProduct, sales }: Props) {
  const [isPending, startTransition] = useTransition();
  const { setQuery, searchParams } = useSetQuery(10);
  const { productSale, sale } = saleWithProduct!;

  const currency = searchParams.get('currency') || 'USD';

  const currentInvoice = useMemo(() => {
    return sales?.sale.find(
      (inv) => inv.id === +(searchParams.get('invoice') ?? 0)
    );
  }, [searchParams, sales?.sale]);

  const handleDiscount = useCallback(
    debounce(async (v: string) => {
      const discount = Number.parseFloat(v || '0');
      if (discount >= 0) await discountSaleActions(sale.id, discount);
    }, 500),
    [sale.id] // Dependency array
  );

  const formatedPrices = (amount: number) => {
    return formatCurrency(amount, sale.dollar, currency);
  };

  const pricing = useMemo(() => {
    return [
      {
        name: 'کۆی گشتی',
        amount: formatedPrices(sale.totalAmount),
        del: !!sale.discount,
      },
      { name: 'داشکاندن', amount: sale.discount },
      {
        name: 'کۆی گشتی دوای داشکاندن',
        amount: formatedPrices(sale.totalAmount - sale.discount),
      },
    ];
  }, [sale])

  return (
    <aside className="flex h-full flex-[2] flex-col justify-between gap-4 rounded-lg border p-4 shadow">
      <div>
        <div className='flex items-center'>
          <Select
            defaultValue={currentInvoice?.id.toString()}
            onValueChange={(e) => setQuery('invoice', e)}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={currentInvoice?.saleNumber ?? 'وەصڵێک هەڵبژێرە'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>وەصڵەکان</SelectLabel>
                {sales?.sale.filter((e) => !e.isFinished).map((sale) => {
                  return (
                    <SelectItem key={sale.id} value={sale.id.toString()}>
                      <p className="me-3 inline">{sale.saleNumber}</p>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
          <BackButton variant={{ variant: "default" }} />
        </div>
        <div className="h-fit border-b p-2">
          {pricing.map((p) =>
            p.name === 'داشکاندن' ? (
              <div key={p.name} className="flex items-center gap-8 space-y-1">
                <p>{p.name}:</p>
                <Input
                  dir="ltr"
                  className="h-8"
                  defaultValue={p.amount}
                  onChange={(e) => handleDiscount(e.currentTarget.value)}
                />
              </div>
            ) : (
              <div
                className="flex items-center justify-between space-y-2 font-medium"
                key={p.name}
              >
                <p>{p.name}</p>
                {p.del ? (
                  <del className="text-red-500">{p.amount}</del>
                ) : (
                  <p>{p.amount}</p>
                )}
              </div>
            )
          )}
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-lg font-medium">تەواوکردن :</h2>
            <CustomDialogWithTrigger
              className="flex flex-col overflow-hidden px-12 py-10 md:max-w-xl"
              button={
                <Button disabled={sale.isFinished} variant="default" size="sm">
                  <Calculator className="size-4" />
                </Button>
              }
            >
              <SubmitForm sale={sale} />
            </CustomDialogWithTrigger>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 overflow-scroll">
        {productSale.map((order) => (
          <Card
            key={order.productId}
            className="h-fit border-0 border-b last:border-0"
          >
            <CardHeader className="flex-row items-center justify-between p-2 px-3">
              <CardTitle>{order.name}</CardTitle>
              <CardDescription className="font-semibold">
                {formatCurrency(order.price, sale.dollar, currency)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between p-2 px-3">
              <form
                action={() => {
                  startTransition(async () => {
                    const { message, success } =
                      await deleteProductEntrlyActions(order.id!);
                    if (!success) toast.error(message);
                  });
                }}
              >
                <Button
                  className="me-4 max-h-8 rounded-lg p-2"
                  disabled={isPending}
                  variant="destructive"
                  size="sm"
                >
                  <Trash className="size-4" />
                </Button>
              </form>
              <div className="flex items-center gap-3">
                <form
                  action={() => {
                    startTransition(async () => {
                      const { message, success } =
                        await increaseProductQuantityActions(order.id!, 1);
                      if (!success) toast.error(message);
                    });
                  }}
                >
                  <Button
                    disabled={isPending}
                    className="max-h-8 rounded-lg p-2"
                    size="sm"
                    variant="secondary"
                  >
                    <Plus className="size-4" />
                  </Button>
                </form>
                <p>{order.quantity}</p>
                <form
                  action={() => {
                    startTransition(async () => {
                      const { message, success } =
                        await decreaseProductQuantityActions(order.id!, 1);
                      if (!success) toast.error(message);
                    });
                  }}
                >
                  <Button
                    disabled={isPending}
                    className="max-h-8 rounded-lg p-2"
                    size="sm"
                    variant="secondary"
                  >
                    <Minus className="size-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </aside>
  );
}

function SubmitForm({ sale }: { sale: OneSale }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <span className="mx-auto block w-fit rounded-full bg-blue-200/80 p-2">
            <CheckCheck size={28} className="text-blue-500" />
          </span>
        </DialogTitle>
      </DialogHeader>
      <form
        action={async () => {
          if (sale.id && !sale.isFinished) {
            const { message, success } = await finishSaleActions(sale.id, true);
            if (success) {
              toast.info(message);
              redirect(`/customer/${sale.customerId}`);
            }
            toast.error(message);
            return;
          }
          toast.error('هەڵەیەک هەیە');
        }}
        className="flex w-full flex-col gap-4"
      >
        <div className="space-y-2 text-center">
          <p className="text-foreground/60 text-base">
            دڵنیای لە تەواوکردنی ئەم وەصڵە..؟
          </p>
        </div>
        <DialogFooter className="mt-3 w-full gap-3 sm:justify-center">
          <Button className="min-w-fit flex-1" type="submit">
            تەواوکردن
          </Button>
          <DialogClose className="min-w-fit flex-1">
            <Button variant="secondary" type="reset" className="w-full">
              داخستن
            </Button>
          </DialogClose>
        </DialogFooter>
      </form>
    </>
  );
}
