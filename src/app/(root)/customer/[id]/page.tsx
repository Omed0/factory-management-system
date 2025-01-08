import { UsersRound } from 'lucide-react';
import Link from 'next/link';

import { column_sale } from '../_component/column-sales';
import { DataTable } from '../_component/data-table';
import { getCustomerListSaleActions } from '@/actions/sale';


type Props = {
  searchParams: {
    status: 'trash' | 'active';
  };
  params: {
    id: string;
  };
};

export const dynamic = 'force-dynamic';

export default async function SpecificCustomerSales({
  searchParams,
  params,
}: Props) {
  const isTrash = searchParams.status === 'trash';
  const customerId = Number(params.id);
  const sales = await getCustomerListSaleActions(customerId, isTrash);

  if (!sales.success) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-lg font-medium">{sales.message}</h1>
          <Link
            replace
            href="/customer"
            className="p-3 text-blue-500 underline-offset-8 hover:underline"
          >
            بچۆرەوە بۆ کڕیارەکان
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full space-y-4 p-2">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <UsersRound className="size-5" />
          <h1 className="text-lg font-medium">
            {isTrash ? 'وەصڵە ئەرشیفکراوەکان' : 'وەصڵە بەردەستەکان'}
          </h1>
        </div>
      </div>
      <DataTable
        customer={sales.data?.customer}
        data={sales.data?.sale ?? []}
        columns={column_sale}
      />
    </section>
  );
}
