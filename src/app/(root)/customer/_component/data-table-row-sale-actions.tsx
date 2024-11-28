"use client"

import { Edit, Info, MoreHorizontalIcon, Plus, Trash } from "lucide-react"
import { type Row } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CustomDialogWithTrigger from "@/components/layout/custom-dialog-trigger"
import { useState } from "react"
import DeleteModal from "@/components/delete-modal"
import useSetQuery from "@/hooks/useSetQuery"
import RestorModal from "@/components/restore-modal"
import {
    Table, TableCaption, TableHead, TableRow,
    TableHeader, TableCell, TableBody
} from "@/components/ui/table"
import { OneSale } from '@/server/schema/sale'
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { deletePaidLoanSaleListActions, deleteSaleForCustomerActions, forceDeleteSaleForCustomerActions, getPaidLoanSaleListActions, restoreSaleForCustomerActions } from "@/actions/sale"
import AddPaidLoanSale from "./add-loan-sale-form"
import FormSaleForCustomer from "./add-sale-form"
import { useDollar } from "@/hooks/useDollar"
import { formatCurrency } from "@/lib/utils"


export function DataTableRowSaleActions({
    row
}: { row: Row<OneSale> }) {
    const { searchParams } = useSetQuery()
    const isTrash = searchParams.get("status") === "trash"

    const [open, setOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const sale = row.original

    if (!sale) {
        return (
            <Button
                disabled
                variant="ghost"
                className="flex size-8 p-0"
            >
                <MoreHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
            </Button>
        )
    }

    const isLoan = sale.saleType === "LOAN";
    const isShowInvoiceInfo = isLoan && !isTrash

    return (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex size-8 p-0 data-[state=open]:bg-muted"
                >
                    <MoreHorizontalIcon className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px] m-2">
                {isShowInvoiceInfo && (
                    <>
                        <CustomDialogWithTrigger
                            className="w-full p-6 pt-4"
                            button={<Button
                                className="w-full h-9 hover:bg-accent"
                                variant="link"
                            >
                                <Info className="size-5 me-2" />
                                زانیاری وەصڵ
                            </Button>}
                        >
                            <ModalTablePaidLoanSale
                                saleId={sale.id}
                                isTrash={isTrash}
                            />
                        </CustomDialogWithTrigger>
                        <DropdownMenuSeparator />
                    </>
                )}
                {isTrash ? (
                    <RestorModal
                        description="دڵنیای لە هێنانەوەی ئەم وەصڵە"
                        restorKey={sale.id}
                        classNameButton="w-full h-9"
                        action={(id) => restoreSaleForCustomerActions(id, sale.customerId!)}
                        title={`${sale.saleNumber}`}
                    />
                ) : (
                    <CustomDialogWithTrigger
                        open={open}
                        onOpenChange={(e) => {
                            if (isTrash) return
                            if (!e) setDropdownOpen(false)
                            setOpen(e)
                        }}
                        button={<Button
                            disabled={isTrash}
                            className="w-full h-9"
                            variant={isTrash ? "link" : "ghost"}
                        >
                            <Edit className="size-5 me-2" />
                            گۆڕانکاری
                        </Button>}
                    >
                        <section className="w-full p-4">
                            <FormSaleForCustomer
                                customerName={sale.saleNumber}
                                customerId={sale.customerId!}
                                title="گۆڕانکاری لە وەصڵ"
                                sale={{ ...sale }}
                                handleClose={() => {
                                    setDropdownOpen(false)
                                    setOpen(false)
                                }}
                            />
                        </section>
                    </CustomDialogWithTrigger>
                )}
                <DropdownMenuSeparator />
                <DeleteModal
                    description={`${isTrash ? "ئەم وەصڵە بە تەواوی دەسڕێتەوە" : 'دڵنیایی لە ئەرشیفکردنی ئەم وەصڵە'}`}
                    submit={(id) => isTrash ?
                        forceDeleteSaleForCustomerActions(id, sale.customerId!) :
                        deleteSaleForCustomerActions(id, sale.customerId!)}
                    classNameButton="bg-red-500 text-white w-full h-9"
                    title={`${sale.saleNumber}`}
                    onClose={() => setDropdownOpen(false)}
                    deleteKey={sale.id}
                    isTrash={isTrash}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


export function ModalTablePaidLoanSale(
    { saleId, isTrash }:
        { saleId: number, isTrash: boolean }
) {
    const [open, setOpen] = useState(false)
    const { searchParams } = useSetQuery()
    const { data: { dollar } } = useDollar()

    const currency = searchParams.get("currency") || "USD"

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["customer-paidLoan-sale", saleId],
        queryFn: async () => await getPaidLoanSaleListActions(saleId),
        enabled: !isTrash && saleId > 0
    })

    const formatedPrice = (amount: number) => {
        return formatCurrency(amount, dollar, currency)
    }

    if (isLoading) return <div className="text-center p-4">چاوەڕوانبە ...</div>
    if (isError || !data?.success || isTrash || !data.data) {
        return <div className="text-red-500 text-center p-4">
            {error?.message || data?.message || "وەصڵی سڕاوە داتای پشان نادرێت"}
        </div>
    }

    const { loan, sale } = data.data

    const totalRemainig = sale.totalRemaining
    const totalAmount = sale.totalAmount

    const totalPeriod = totalAmount - totalRemainig
    const totalPeriodAfterDiscount = totalPeriod - sale.discount

    const isFinished = totalPeriodAfterDiscount === 0 && totalAmount > 0//cannot add other paidLoan until have different value total and remainig

    const totalInfo = [
        {
            title: "کۆی قەرز", value: formatedPrice(totalAmount),
            valueWithDiscount: formatedPrice(totalAmount - sale.discount)
        },
        {
            title: "کۆی دراوە", value: formatedPrice(totalRemainig),
            valueWithDiscount: formatedPrice(totalRemainig - sale.discount)
        },
        {
            title: "قەرزی ماوە", value: formatedPrice(totalPeriod),
            valueWithDiscount: formatedPrice(totalPeriodAfterDiscount)
        }
    ]

    return (
        <section className="flex-1">
            {!isFinished && (
                <CustomDialogWithTrigger
                    open={open}
                    onOpenChange={(e) => {
                        if (e) refetch()
                        setOpen(e)
                    }}
                    className="p-4"
                    button={<Button disabled={isFinished}>
                        <Plus className="size-5 me-2" />
                        زیادکردن
                    </Button>}
                >
                    <AddPaidLoanSale
                        saleId={sale.id}
                        amountPeriod={totalPeriodAfterDiscount}
                        title="زیادکردنی قیست"
                        handleClose={() => {
                            refetch()
                            setOpen(false)
                        }}
                    />
                </CustomDialogWithTrigger>
            )}
            <Table className="w-full flex-1 mt-4">
                <TableCaption className="my-6">
                    <div className="w-full flex flex-wrap justify-center items-center gap-4">
                        {totalInfo.map((item) => (
                            <div key={item.title} className="flex items-center">
                                <span className="text-sm">{item.title}:</span>
                                <Badge variant="secondary">
                                    {item.valueWithDiscount !== undefined && sale.discount > 0 ? (
                                        <div>
                                            <del className="text-red-500">{item.value}</del>
                                            <span className="block">{item.valueWithDiscount}</span>
                                        </div>
                                    ) : (
                                        <span>{item.value}</span>
                                    )}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </TableCaption>
                <TableCaption>
                    {isFinished ? "تەواوبووە" : loan.length === 0 ? "هیچ قیستێک نەدراوەتەوە"
                        : `${loan.length} جار پارە دراوە`}
                </TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">ژمارە</TableHead>
                        <TableHead>بڕ</TableHead>
                        <TableHead>بەروار</TableHead>
                        <TableHead className="text-center">تێبینی</TableHead>
                        <TableHead className="text-center">سڕینەوە</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loan.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="w-[80px]">
                                {item.id}
                            </TableCell>
                            <TableCell className="amount-cell">{item.amount}</TableCell>
                            <TableCell>{new Date(item.paidDate).toLocaleDateString('en-US')}</TableCell>
                            <TableCell className="text-center text-wrap max-w-96">{item.note}</TableCell>
                            <TableCell className="text-center">
                                <form id="deletePurchaseInfo" action={async () => {
                                    const { success, message } = await
                                        deletePaidLoanSaleListActions(item.id, sale.id)
                                    if (success) {
                                        toast.success(message)
                                        refetch()
                                        setOpen(false)
                                    } else toast.error(message)
                                }}>
                                    <Button
                                        form="deletePurchaseInfo"
                                        variant="destructive"
                                        className="size-7"
                                        size="icon"
                                    >
                                        <Trash />
                                    </Button>
                                </form>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </section>
    )
}

