import { getCustomerListSaleActions, getProductSaleListActions } from "@/actions/sale"
import SaleInvoice from "./_component/sale-invoice"
import Link from "next/link"
import { getListProductActions } from "@/actions/product"
import Products from "./_component/products"

type Props = {
    searchParams: {
        invoice: string
        currency: string
    },
    params: {
        id: string
    }
}

export default async function SpecificCustomerSale({ params, searchParams }: Props) {
    const saleId = Number(searchParams.invoice)
    const customerId = Number(params.id)

    const currency = searchParams.currency || "USD"

    const { success, SaleWithProducts, message } = await getProductSaleListActions(saleId, customerId)
    const [sales, product] = await Promise.all([
        getCustomerListSaleActions(customerId, false),
        getListProductActions({ isTrash: undefined })])


    if (!success || !product.success || !SaleWithProducts || !product.data) {
        return <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
                <h1 className="text-lg font-medium">{message || product.message || "هەڵەیەک هەیە"}</h1>
                <Link
                    replace href="/customer"
                    className="p-3 hover:underline underline-offset-8 text-blue-500"
                >بچۆرەوە بۆ کڕیارەکان</Link>
            </div>
        </div>
    }


    return (
        <section className="w-full space-y-4 p-2">
            <div className='flex-1 flex justify-between overflow-hidden h-[86svh] gap-5'>
                <SaleInvoice
                    saleWithProduct={SaleWithProducts}
                    sales={sales.data}
                />
                <Products
                    invoice={SaleWithProducts.sale}
                    product={product.data}
                    currency={currency}
                />
            </div>
        </section>
    )
}