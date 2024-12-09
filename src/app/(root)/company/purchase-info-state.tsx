import { useQuery } from '@tanstack/react-query';

import { getListCompanyPurchaseInfoActions } from '@/actions/company';

export function usePurchaseInfo(companyPurchaseId: number, isTrash?: boolean) {
  const datas = useQuery({
    queryKey: ['company-purchase-info', companyPurchaseId],
    queryFn: async () =>
      (await getListCompanyPurchaseInfoActions(companyPurchaseId)).data,
    enabled:
      +companyPurchaseId > 0 && isTrash !== undefined ? !isTrash : undefined,
  });

  return datas;
}
