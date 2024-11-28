"use client"

import {
    decreaseProductQuantityActions, deleteProductEntrlyActions, discountSaleActions, finishSaleActions, getCustomerListSaleActions,
    getProductSaleListActions, increaseProductQuantityActions
} from "@/actions/sale"
import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useDollar } from "@/hooks/useDollar"
import useSetQuery from "@/hooks/useSetQuery"
import { debounce, formatCurrency } from "@/lib/utils"
import { OneSale } from "@/server/schema/sale"
import { Calculator, CheckCheck, Minus, Plus, Trash } from "lucide-react"
import { redirect } from "next/navigation"
import { useMemo, useTransition } from "react"
import { toast } from "sonner"


type Props = {
    saleWithProduct: Awaited<ReturnType<typeof getProductSaleListActions>>['SaleWithProducts'],
    sales: Awaited<ReturnType<typeof getCustomerListSaleActions>>['data'],
}

export default function SaleInvoice({ saleWithProduct, sales }: Props) {
    const { data: { dollar } } = useDollar()
    const [isPending, startTransition] = useTransition()
    const { setQuery, searchParams } = useSetQuery(10)
    const { productSale, sale } = saleWithProduct!

    const currency = searchParams.get("currency") || "USD"

    const currentInvoice = useMemo(() => {
        return sales?.sale.find((inv) => inv.id === +(searchParams.get("invoice") ?? 0))
    }, [searchParams.get("invoice")])

    const handleDiscount = debounce(async (v: string) => { // Updated to accept string directly
        const discount = Number.parseFloat(v || "0")
        if (discount >= 0) await discountSaleActions(sale.id, discount)
    }, 500)

    const formatedPrices = (amount: number) => {
        return formatCurrency(amount, dollar, currency)
    }

    const pricing = [
        { name: "کۆی گشتی", amount: formatedPrices(sale.totalAmount), del: !!sale.discount },
        { name: "داشکاندن", amount: sale.discount },
        { name: "کۆی گشتی دوای داشکاندن", amount: formatedPrices(sale.totalAmount - sale.discount) },
    ]

    return (
        <aside className='flex-[2] flex flex-col gap-4 border shadow rounded-lg h-full p-4 justify-between'>
            <div>
                <Select defaultValue={currentInvoice?.id.toString()} onValueChange={(e) => setQuery("invoice", e)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={currentInvoice?.saleNumber ?? "وەصڵێک هەڵبژێرە"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>وەصڵەکان</SelectLabel>
                            {sales?.sale.map((sale) => {
                                const isFinish = sale.isFinished === true
                                return (
                                    <SelectItem
                                        key={sale.id}
                                        value={sale.id.toString()}
                                    >
                                        <p className="inline me-3">{sale.saleNumber}</p>
                                        <Badge variant={isFinish ? "default" : "destructive"}>
                                            {isFinish ? "تەواوبوو" : "تەواو نەبوو"}
                                        </Badge>
                                    </SelectItem>
                                )
                            })}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <div className="h-fit p-2 border-b">
                    {pricing.map((p) => (
                        p.name === "داشکاندن" ? (
                            <div className="space-y-1 flex items-center gap-8">
                                <p>{p.name}:</p>
                                <Input
                                    dir="ltr"
                                    className="h-8"
                                    defaultValue={sale.discount}
                                    onChange={(e) => handleDiscount(e.currentTarget.value)}
                                />
                            </div>
                        ) : (
                            <div className="space-y-2 font-medium flex items-center justify-between" key={p.name}>
                                <p>{p.name}</p>
                                {p.del ? <del className="text-red-500">{p.amount}</del> : <p>{p.amount}</p>}
                            </div>
                        )
                    ))}
                    <div className="flex items-center justify-between pt-2">
                        <h2 className="text-lg font-medium">تەواوکردن :</h2>
                        <CustomDialogWithTrigger
                            className="flex flex-col py-10 px-12 md:max-w-xl overflow-hidden"
                            button={<Button disabled={sale.isFinished} variant="default" size="sm">
                                <Calculator className="size-4" />
                            </Button>}
                        >
                            <SubmitForm sale={sale} />
                        </CustomDialogWithTrigger>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-4 overflow-scroll">
                {productSale.map((order) => (
                    <Card key={order.productId} className="h-fit border-0 border-b last:border-0">
                        <CardHeader className="p-2 px-3 flex-row items-center justify-between">
                            <CardTitle>{order.product?.name}</CardTitle>
                            <CardDescription className="font-semibold">
                                {formatedPrices(order.price)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-2 px-3 flex items-center justify-between">
                            <form action={() => {
                                startTransition(async () => {
                                    const { message, success } = await deleteProductEntrlyActions(order.id!)
                                    if (!success) toast.error(message)
                                })
                            }}>
                                <Button
                                    className="p-2 me-4 max-h-8 rounded-lg"
                                    disabled={isPending}
                                    variant="destructive"
                                    size="sm"
                                >
                                    <Trash className="size-4" />
                                </Button>
                            </form>
                            <div className="flex items-center gap-3">
                                <form action={() => {
                                    startTransition(async () => {
                                        const { message, success } = await increaseProductQuantityActions(order.id!, 1)
                                        if (!success) toast.error(message)
                                    })
                                }}>
                                    <Button
                                        disabled={isPending}
                                        className="p-2 max-h-8 rounded-lg"
                                        size="sm" variant="secondary">
                                        <Plus className="size-4" />
                                    </Button>
                                </form>
                                <p>{order.quantity}</p>
                                <form action={() => {
                                    startTransition(async () => {
                                        const { message, success } = await decreaseProductQuantityActions(order.id!, 1)
                                        if (!success) toast.error(message)
                                    })

                                }}>
                                    <Button
                                        disabled={isPending}
                                        className="p-2 max-h-8 rounded-lg"
                                        size="sm" variant="secondary">
                                        <Minus className="size-4" />
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </aside >
    )
}


function SubmitForm({ sale }: { sale: OneSale }) {
    return (
        <>
            <DialogHeader>
                <DialogTitle>
                    <span className="w-fit block mx-auto p-2 bg-blue-200/80 rounded-full">
                        <CheckCheck size={28} className="text-blue-500" />
                    </span>
                </DialogTitle>
            </DialogHeader>
            <form
                action={async () => {
                    if (sale.id && !sale.isFinished) {
                        const { message, success } = await finishSaleActions(sale.id, true)
                        if (success) {
                            toast.info(message)
                            redirect(`/customer/${sale.customerId}`)
                        }
                        toast.error(message)
                        return
                    }
                    toast.error("هەڵەیەک هەیە")
                }}
                className="w-full flex flex-col gap-4"
            >
                <div className="text-center space-y-2">
                    <p className="text-base text-foreground/60">
                        دڵنیای لە تەواوکردنی ئەم وەصڵە..؟
                    </p>
                </div>
                <DialogFooter className="w-full gap-3 sm:justify-center mt-3">
                    <Button className="flex-1 min-w-fit" type="submit">
                        تەواوکردن
                    </Button>
                    <DialogClose className="flex-1 min-w-fit">
                        <Button variant="secondary" type="reset" className="w-full">
                            داخستن
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </form>
        </>
    )
}

