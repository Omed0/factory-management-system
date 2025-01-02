import { Users } from 'lucide-react';

import { columns } from './_component/columns';
import { DataTable } from './_component/data-table';

import { getCompanyListActions } from '@/actions/company';

type Props = {
  searchParams: {
    status: 'trash' | 'active';
  };
};

export default async function Company({ searchParams }: Props) {
  const isTrash = searchParams.status === 'trash';
  const companies = await getCompanyListActions(isTrash);


  if (!companies.success) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-lg font-medium">{companies.message}</h1>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full space-y-4 p-2">
      <div className="flex items-center gap-2">
        <Users className="size-5" />
        <h1 className="text-lg font-medium">
          {isTrash ? 'کۆمپانیا ئەرشیفکراوەکان' : 'کۆمپانیا بەردەستەکان'}
        </h1>
      </div>
      <DataTable columns={columns} data={companies.data ?? []} />
    </section>
  );
}
