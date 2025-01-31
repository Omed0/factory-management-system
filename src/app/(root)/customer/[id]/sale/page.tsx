import Link from 'next/link';

import Products from './_component/products';
import SaleInvoice from './_component/sale-invoice';

import { getListProductActions } from '@/actions/product';
import {
  getCustomerListSaleActions,
  getProductSaleListActions,
} from '@/actions/sale';

type Props = {
  searchParams: {
    invoice: string;
    currency: string;
  };
  params: {
    id: string;
  };
};

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SpecificCustomerSale({
  params,
  searchParams,
}: Props) {
  const saleId = Number(searchParams.invoice);
  const customerId = Number(params.id);

  const currency = searchParams.currency || 'USD';

  const { success, SaleWithProducts, message } =
    await getProductSaleListActions(saleId);

  const [sales, product] = await Promise.all([
    getCustomerListSaleActions(customerId, false),
    getListProductActions({ isTrash: false }),
  ]);

  const isFail = !success || !product.success || !SaleWithProducts || !product.data

  if (isFail) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-lg font-medium">
            {message || product.message || 'هەڵەیەک هەیە'}
          </h1>
          <Link
            replace
            href={`/customer/${params.id}`}
            className="p-3 text-blue-500 underline-offset-8 hover:underline"
          >
            بچۆرەوە بۆ کڕیار
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full space-y-4 p-2 relative">
      <div className="flex h-[86svh] flex-1 justify-between gap-5 overflow-hidden">
        <SaleInvoice saleWithProduct={SaleWithProducts} sales={sales.data} />
        <Products
          invoice={SaleWithProducts.sale}
          product={product.data}
          currency={currency}
        />
      </div>
    </section>
  );
}
