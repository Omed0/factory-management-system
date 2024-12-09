import { PlusCircleIcon } from 'lucide-react';
import { Users } from 'lucide-react';
import Link from 'next/link';

import AddPurchase from '../_component/add-purchase-form';
import { column_purchase } from '../_component/column-purchase';
import { DataTable } from '../_component/data-table';

import { getCompanyListPurchaseActions } from '@/actions/company';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import { Button } from '@/components/ui/button';

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

  return (
    <section className="w-full space-y-4 p-2">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5" />
          <h1 className="text-lg font-medium">
            {isTrash ? 'کڕدراوە ئەرشیفکراوەکان' : 'کڕدراوە بەردەستەکان'}
          </h1>
        </div>
        <CustomDialogWithTrigger
          button={
            <Button>
              <PlusCircleIcon className="me-2 size-4" />
              کڕین
            </Button>
          }
        >
          <section className="w-full p-4">
            <AddPurchase title="زیادکردنی کڕین" />
          </section>
        </CustomDialogWithTrigger>
      </div>
      <DataTable
        columns={column_purchase as any[]}
        data={companyPurchase.data ?? []}
      />
    </section>
  );
}
