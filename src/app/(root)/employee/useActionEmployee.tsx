import { useQuery } from '@tanstack/react-query';

import { getEmployeeActionActions } from '@/actions/employee';
import { MonthParams } from '@/server/schema/employee';

export default function useActionEmployee(
  empId: number,
  dataQuery: MonthParams
) {
  const data = useQuery({
    queryKey: ['employeeActions', String(empId)],
    queryFn: async () => await getEmployeeActionActions(empId, dataQuery),
    enabled: !!empId && empId > 0,
  });

  return data;
}
