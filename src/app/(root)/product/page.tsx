import { HandCoins } from 'lucide-react';

import { columns } from './_component/columns';
import { DataTable } from './_component/data-table';

import { getListProductActions } from '@/actions/product';

type Props = {
  searchParams: {
    status: string;
  };
};

export default async function Product({ searchParams }: Props) {
  const isTrash = searchParams.status === 'trash' ? true : false;

  const products = await getListProductActions({ isTrash });

  if (!products.success) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-lg font-medium">{products.message}</h1>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full space-y-4 p-2">
      <div className="flex items-center gap-2">
        <HandCoins className="size-5" />
        <h1 className="text-lg font-medium">
          {isTrash ? 'مەوادە ئەرشیفکراوەکان' : 'مەوادە بەردەستەکان'}
        </h1>
      </div>
      <DataTable columns={columns} data={products.data || []} />
    </section>
  );
}
