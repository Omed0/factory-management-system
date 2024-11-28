import { getListCompanyPurchaseInfoActions } from "@/actions/company";
import { useQuery } from "@tanstack/react-query";

export function usePurchaseInfo(companyPurchaseId: number, isTrash?: boolean) {
    const datas = useQuery({
        queryKey: ["company-purchase-info", companyPurchaseId],
        queryFn: async () => await getListCompanyPurchaseInfoActions(companyPurchaseId),
        enabled: +companyPurchaseId > 0 && isTrash !== undefined ? !isTrash : undefined
    })

    return datas
}   