import { Users } from 'lucide-react';
import Link from 'next/link';
import { column_purchase } from '../_component/column-purchase';
import { DataTable } from '../_component/data-table';
import { getCompanyListPurchaseActions } from '@/actions/company';

type Props = {
  searchParams: {
    status: 'trash' | 'active';
  };
  params: {
    id: string;
  };
};

export default async function SpecificCompany({ searchParams, params }: Props) {
  const isTrash = searchParams.status === 'trash';
  const companyPurchase = await getCompanyListPurchaseActions(
    Number(params.id),
    isTrash
  );

  if (!companyPurchase.success) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-lg font-medium">{companyPurchase.message}</h1>
          <Link
            replace
            href="/company"
            className="p-3 text-blue-500 underline-offset-8 hover:underline"
          >
            بچۆرەوە بۆ کۆمپانیاکان
          </Link>
        </div>
      </div>
    );
  }

  const companyName = companyPurchase.data?.company?.name || "دیارینەکراو"

  return (
    <section className="w-full space-y-4 p-2">
      <div className="flex items-center gap-2">
        <Users className="size-5" />
        <h1 className="text-lg font-medium">
          {isTrash ? `کڕدراوە ئەرشیفکراوەکانی ${companyName}` : `کڕدراوە بەردەستەکانی ${companyName}`}
        </h1>
      </div>
      <DataTable
        columns={column_purchase as any[]}
        data={companyPurchase.data?.purchases ?? []}
      />
    </section>
  );
}
