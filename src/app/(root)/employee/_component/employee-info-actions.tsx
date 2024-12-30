'use client';

import { useEffect } from 'react';
import { Trash } from 'lucide-react';
import { toast } from 'sonner';

import useActionEmployee from '../useActionEmployee';
import EditEmployeeActions from './edit-employee-action';

import { deleteEmployeeActionActions } from '@/actions/employee';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import useSetQuery from '@/hooks/useSetQuery';
import { cn, formatCurrency, getMonthStartAndEndOfMonth } from '@/lib/utils';
import { OneEmployee, UpdateEmployeeAction } from '@/server/schema/employee';
import { addition_actions, subtraction_actions, tr_employee_action } from '@/lib/constant';
import { useDollar } from '@/hooks/useDollar';
import { Badge } from '@/components/ui/badge';

type Props = {
  employee: OneEmployee;
};

export default function EmployeeInfoActions({ employee }: Props) {
  const { searchParams } = useSetQuery();
  const { data: { dollar } } = useDollar()
  const month = searchParams.get('month');
  const currency = searchParams.get('currency') || 'USD';
  const now = new Date();

  const dateQuery = month
    ? getMonthStartAndEndOfMonth(new Date(now.setMonth(+month - 1)))
    : getMonthStartAndEndOfMonth(now);

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, dollar, currency)
  }

  const {
    data: employeeActions,
    isLoading,
    error,
    isError,
    refetch,
  } = useActionEmployee(employee.id, dateQuery);

  useEffect(() => {
    if (month) refetch();
  }, [month, refetch]);

  if (isLoading || !employeeActions) return <div className='p-6'>چاوەڕوانبە ...</div>;
  if (isError) return <div>{error?.message || "هەڵەیەک هەیە"}</div>;

  const totalAmountActions = employeeActions.reduce((a, c) => {
    if (addition_actions.includes(c.type as typeof addition_actions[number])) {
      return a + c.amount; // Add salary adjustments
    }
    if (subtraction_actions.includes(c.type as typeof subtraction_actions[number])) {
      return a - c.amount; // Subtract salary adjustments
    }
    return a; // No change for unlisted actions
  }, 0);

  const employeeInfo = [
    { name: "مووچەی کارمەند", value: formatAmount(employee.monthSalary), isCalculate: totalAmountActions !== 0 },
    { name: "مووچەکەی دوای لێبڕین", value: formatAmount(employee.monthSalary + totalAmountActions) }
  ];


  return (
    <Table className='border mt-4'>
      <TableCaption className='mt-6'>
        {employeeInfo.map((info) => (
          <div className='inline-flex items-center ms-5 gap-1 text-md' key={info.name}>
            {info.isCalculate ? (
              <del>{info.name}</del>
            ) : (
              <p>{info.name}</p>
            )}
            <Badge variant="outline"
              className={cn("rounded", {
                "line-through": info.isCalculate,
                "border-red-500 text-red-500": totalAmountActions < 0,
                "border-green-500 text-green-500": !info.isCalculate && totalAmountActions > 0,
              })}
            >{info.value}</Badge>
          </div>
        ))}
      </TableCaption>
      <TableCaption>
        {employeeActions?.length === 0 && employee && (
          <p className="text-inherit">{employee.name} هیچ داتایەکی نییە</p>
        )}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="border-x text-center w-32">جۆر</TableHead>
          <TableHead className="border-x text-center w-28">بڕ</TableHead>
          <TableHead className="border-x text-center w-32">کات</TableHead>
          <TableHead className="border-x text-center">تێبینی</TableHead>
          <TableHead className="border-x text-center w-28">زیاتر</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!isLoading &&
          employeeActions?.map((action) => (
            <TableRow key={action.id}>
              <TableCell className='p-2 text-center'>{tr_employee_action.get(action.type)}</TableCell>
              <TableCell className='p-2 text-center'>
                {formatCurrency(action.amount, action.dollar, currency)}
              </TableCell>
              <TableCell className='p-2 text-center'>
                {new Date(action.dateAction).toLocaleDateString()}
              </TableCell>
              <TableCell className="max-w-96 text-wrap p-2 text-center">
                {action.note}
              </TableCell>
              <TableCell className="flex items-center justify-center gap-4 text-center p-2">
                <EditEmployeeActions
                  id={action.id}
                  key={action.id}
                  infoAction={{ ...action } as UpdateEmployeeAction}
                />
                <form
                  action={async () => {
                    const { success, message } =
                      await deleteEmployeeActionActions(action.id);
                    if (!success) {
                      toast.error(message);
                      return;
                    }
                    toast.success(message);
                    refetch();
                  }}
                >
                  <Button variant="destructive" className='h-8 px-2'>
                    <Trash className="size-5" />
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table >
  );
}
