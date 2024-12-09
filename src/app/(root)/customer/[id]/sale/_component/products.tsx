'use client';

import { Plus } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

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
import { useDollar } from '@/hooks/useDollar';
import { formatCurrency } from '@/lib/utils';
import { OneProduct } from '@/server/schema/product';
import { OneSale } from '@/server/schema/sale';

type Props = {
  product: OneProduct[];
  invoice: OneSale;
  currency: string;
};

export default function Products({ product, invoice, currency }: Props) {
  const {
    data: { dollar },
  } = useDollar();

  return (
    <section className="flex h-full flex-[4] flex-wrap gap-4 overflow-scroll rounded-lg border-2 p-4 shadow">
      {product.map((product) => (
        <Card key={product.id} className="h-fit">
          <CardHeader className="flex-row items-center justify-between p-3">
            <CardTitle>{product.name}</CardTitle>
            <CardDescription className="font-semibold">
              {product.unitType === 'PIECE' ? 'دانە' : 'مەتر'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <Image
              width={300}
              height={300}
              className="aspect-video max-w-48 object-contain"
              alt={product.name}
              src={product.image ? `/${product.image}` : '/opengraph-image.png'}
              onError={(event) => {
                event.currentTarget.id = '/opengraph-image.png';
                event.currentTarget.srcset = '/opengraph-image.png';
              }}
            />
          </CardContent>
          <CardFooter className="justify-between p-2 px-3">
            <p>{formatCurrency(product.price, dollar, currency)}</p>
            <form
              className="[all:unset]"
              action={async () => {
                const formated = {
                  productId: product.id,
                  price: product.price,
                  saleId: invoice.id,
                  quantity: 1,
                };
                const { success, message } =
                  await createProductSaleListActions(formated);
                if (!success) toast.error(message);
              }}
            >
              <Button
                className="max-h-8 rounded-lg p-2"
                size="sm"
                variant="secondary"
              >
                <Plus className="size-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      ))}
    </section>
  );
}
