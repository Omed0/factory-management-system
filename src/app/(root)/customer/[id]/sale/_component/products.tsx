"use client"

import { Button } from '@/components/ui/button';
import { createProductSaleListActions } from '@/actions/sale';
import { toast } from 'sonner';
import { Card, CardDescription, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { OneProduct } from '@/server/schema/product';
import { OneSale } from '@/server/schema/sale';
import { useDollar } from '@/hooks/useDollar';
import { formatCurrency } from '@/lib/utils';

type Props = {
    product: OneProduct[],
    invoice: OneSale,
    currency: string
}

export default function Products({ product, invoice, currency }: Props) {
    const { data: { dollar } } = useDollar()

    return (
        <section className='flex-[4] flex flex-wrap gap-4 border-2 shadow rounded-lg h-full overflow-scroll p-4'>
            {product.map((product) => (
                <Card key={product.id} className="h-fit">
                    <CardHeader className="p-3 flex-row items-center justify-between">
                        <CardTitle>{product.name}</CardTitle>
                        <CardDescription className="font-semibold">{product.unitType === "PIECE" ? "دانە" : "مەتر"}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3">
                        <Image
                            width={300}
                            height={300}
                            className="aspect-video object-contain max-w-48"
                            alt={product.name}
                            src={product.image ? `/${product.image}` : "/opengraph-image.png"}
                            onError={(event) => {
                                event.currentTarget.id = "/opengraph-image.png";
                                event.currentTarget.srcset = "/opengraph-image.png";
                            }}
                        />
                    </CardContent>
                    <CardFooter className="p-2 px-3 justify-between">
                        <p>{formatCurrency(product.price, dollar, currency)}</p>
                        <form className="[all:unset]" action={async () => {
                            const formated = { productId: product.id, price: product.price, saleId: invoice.id, quantity: 1 }
                            const { success, message } = await createProductSaleListActions(formated)
                            if (!success) toast.error(message)
                        }}>
                            <Button className="p-2 max-h-8 rounded-lg" size="sm" variant="secondary">
                                <Plus className="size-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            ))}
        </section>
    )
}