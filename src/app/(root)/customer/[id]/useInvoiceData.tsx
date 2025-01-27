import { useQuery } from '@tanstack/react-query'
import { OneSale } from '@/server/schema/sale'
import { getPaidLoanSaleListActions, getProductWithSaleWithcustomerForInvoiceActions } from '@/actions/sale'

type Props = {
    sale: OneSale
}

export function useInvoiceData({ sale }: Props) {
    const res = useQuery({
        queryKey: ["sale-invoice"],
        queryFn: async () => (await getProductWithSaleWithcustomerForInvoiceActions(sale.id)).sale,
        enabled: !!sale.id && sale.isFinished
    })

    return res
}

export function useLoanInfo({ saleId, isTrash }: { saleId: number, isTrash: boolean }) {
    const res = useQuery({
        queryKey: ['customer-paidLoan-sale', saleId],
        queryFn: async () => await getPaidLoanSaleListActions(saleId),
        enabled: !isTrash && saleId > 0,
    });

    return res
}


