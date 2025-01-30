import { Users } from 'lucide-react';

import { columns } from './_component/columns';
import { DataTable } from './_component/data-table';
import { getEmployeesListActions } from '@/actions/employee';
import ButtonAddEmployee from './_component/button-addEmployee';

type Props = {
  searchParams: {
    status: string;
  };
};

export default async function Employee({ searchParams }: Props) {
  const isTrash = searchParams.status === 'trash';
  const employees = await getEmployeesListActions(isTrash);

  if (!employees.success) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-lg font-medium">{employees.message}</h1>
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
            {isTrash ? 'کارمەندە ئەرشیفکراوەکان' : 'کارمەندە بەردەستەکان'}
          </h1>
        </div>
        <ButtonAddEmployee />
      </div>
      <DataTable columns={columns} data={employees.data || []} />
    </section>
  );
}
