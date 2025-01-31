'use client';

import { useState, useTransition } from 'react';
import { MoveUp, PackagePlus, Plus } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

import AddCustomProduct from '@/app/(root)/customer/_component/add-custom-product';
import { createProductSaleListActions } from '@/actions/sale';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { OneProduct } from '@/server/schema/product';
import { OneSale } from '@/server/schema/sale';
import { Badge } from '@/components/ui/badge';
import { FALLBACK_IMAGE } from '@/lib/constant';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import AddProduct from '@/app/(root)/product/_component/add-product';

type Props = {
  product: OneProduct[];
  invoice: OneSale;
  currency: string;
};

export default function Products({ product, invoice, currency }: Props) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectProduct, setSelectProduct] = useState<OneProduct | null>(null);

  return (
    <section className="space-y-5 h-full flex-[4] overflow-scroll rounded-lg border-2 shadow">
      <div className="border-b-2 w-full p-2 space-y-3 sticky top-0 inset-x-0 bg-background">
        <CustomDialogWithTrigger
          open={open}
          onOpenChange={setOpen}
          button={<Button variant="outline" className='absolute top-1.5 end-2'>
            <PackagePlus />
          </Button>}
        >
          <section className="w-full p-4">
            <AddProduct
              path={`/customer/[id]/sale`}
              title="زیادکردنی مەواد"
              handleClose={() => setOpen(false)}
            />
          </section>
        </CustomDialogWithTrigger>
        <AddCustomProduct
          listProduct={product}
          invoice={invoice}
          product={selectProduct}
          resetSelectProduct={setSelectProduct}
        />
      </div>
      <div className='flex flex-wrap gap-4 px-3'>
        {product.map((pr) => (
          <Card key={pr.id} className="h-fit basis-44 flex-grow max-w-48">
            <CardHeader className="flex-row items-center justify-between p-3">
              <CardTitle className='font-medium'>{pr.name}</CardTitle>
              <CardDescription className="font-medium">
                <Badge variant="outline">
                  {pr.unitType === 'PIECE' ? 'دانە' : 'مەتر'}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <Image
                width={300}
                height={300}
                className="aspect-video max-w-40 object-contain"
                alt={pr.name}
                src={pr.image ? `/${pr.image}` : FALLBACK_IMAGE}
                onError={(event) => {
                  event.currentTarget.id = FALLBACK_IMAGE;
                  event.currentTarget.srcset = FALLBACK_IMAGE;
                }}
              />
            </CardContent>
            <CardFooter className="justify-between p-2.5">
              <p>{formatCurrency(pr.price, pr.dollar, currency)}</p>
              <div className='flex gap-3'>
                <Button
                  size="sm"
                  variant='secondary'
                  type='button'
                  className='max-h-8 rounded-lg p-2'
                  onClick={() => setSelectProduct(pr)}
                >
                  <MoveUp className='size-4' />
                </Button>
                <form
                  className="[all:unset]"
                  action={async () => {
                    const formated = {
                      productId: pr.id,
                      price: pr.price,
                      saleId: invoice.id,
                      name: pr.name,
                      quantity: 1,
                    };
                    startTransition(async () => {
                      const { message, success } =
                        await createProductSaleListActions(formated);
                      if (!success) toast.error(message);
                    });
                  }}
                >
                  <Button
                    className="max-h-8 rounded-lg p-2"
                    disabled={isPending}
                    type='submit'
                    size="sm"
                  >
                    <Plus className="size-4" />
                  </Button>
                </form>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
