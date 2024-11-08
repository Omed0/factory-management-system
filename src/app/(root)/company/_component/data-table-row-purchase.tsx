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
import { OneCompanyPurchase } from "@/server/schema/company"
import {
    deleteCompanyPurchaseActions, deleteCompanyPurchaseInfoActions, forceDeleteCompanyPurchaseActions,
    getListCompanyPurchaseInfoActions, restoreCompanyPurchaseActions
} from "@/actions/company"
import AddPurchase from "./add-purchase-form"
import { Table, TableCaption, TableHead, TableRow, TableHeader, TableCell, TableBody } from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import AddCompanyPurchaseInfo from "./add-purchase-info-form"
import { toast } from "sonner"


export function DataTableRowPurchaseActions({
    row
}: { row: Row<OneCompanyPurchase> }) {
    const { searchParams } = useSetQuery()
    const isTrash = searchParams.get("status") === "trash"

    const [open, setOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const rowData = row.original!

    const isLoan = rowData.type === "LOAN";
    const isFinish = rowData.totalAmount === rowData.totalRemaining;
    const isShowInvoiceInfo = isLoan && !isTrash

    return (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
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
                            <ModalTablePurchaseInfo
                                companyPurchaseId={Number(rowData.id)}
                                isTrash={isTrash}
                            />
                        </CustomDialogWithTrigger>
                        <DropdownMenuSeparator />
                    </>
                )}
                {isTrash ? (
                    <RestorModal
                        description="دڵنیای لە هێنانەوەی ئەم کۆمپانیایە"
                        restorKey={Number(rowData.id)}
                        classNameButton="w-full h-9"
                        action={(id) => restoreCompanyPurchaseActions(id, Number(rowData.companyId))}
                        title={`${rowData.name}`}
                    />
                ) : (
                    <CustomDialogWithTrigger
                        open={open}
                        onOpenChange={(e) => {
                            if (isFinish) return;
                            if (!e) setDropdownOpen(false)
                            setOpen(e)
                        }}
                        button={<Button
                            disabled={isFinish}
                            className="w-full h-9"
                            variant={isTrash ? "link" : "ghost"}
                        >
                            <Edit className="size-5 me-2" />
                            گۆڕانکاری
                        </Button>}
                    >
                        <section className="w-full p-4">
                            <AddPurchase
                                title="زیادکردنی کڕین"
                                purchase={{ ...rowData } as OneCompanyPurchase}
                            />
                        </section>
                    </CustomDialogWithTrigger>
                )}
                <DropdownMenuSeparator />
                <DeleteModal
                    description={`${isTrash ? "ئەم داتایە بە تەواوی دەسڕێتەوە" : 'دڵنیایی لە ئەرشیفکردنی ئەم داتایە'}`}
                    submit={isTrash ? (id) => forceDeleteCompanyPurchaseActions(id, Number(rowData.companyId)) : (id) => deleteCompanyPurchaseActions(id, Number(rowData.companyId))}
                    classNameButton="bg-red-500 text-white w-full h-9"
                    title={`${rowData.name}`}
                    deleteKey={Number(rowData.id)}
                    isTrash={isTrash}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


export function ModalTablePurchaseInfo(
    { companyPurchaseId, isTrash }:
        { companyPurchaseId: number, isTrash: boolean }
) {
    const [open, setOpen] = useState(false)

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["company-purchase-info", companyPurchaseId],
        queryFn: async () => await getListCompanyPurchaseInfoActions(companyPurchaseId),
        enabled: !isTrash && companyPurchaseId !== 0
    })

    if (isLoading) return <div className="text-center p-4">Loading...</div>
    if (isError || !data?.success || isTrash) {
        return <div className="text-red-500 text-center p-4">
            {error?.message || data?.message || "وەصڵی سڕاوە داتای پشان نادرێت"}
        </div>
    }

    const { purchaseInfo, purchase } = data?.data!
    const totalPeriod = purchase?.totalAmount - purchase?.totalRemaining
    const totalInfo = [
        { title: "کۆی قەرز", value: purchase?.totalAmount ?? 0 },
        { title: "کۆی دراوە", value: purchase?.totalRemaining ?? 0 },
        { title: "قەرزی ماوە", value: isNaN(totalPeriod) ? 0 : totalPeriod }
    ]

    return (
        <section className="flex-1">
            <CustomDialogWithTrigger
                className="p-4"
                button={<Button>
                    <Plus className="size-5 me-2" />
                    زیادکردن
                </Button>}
                open={open}
                onOpenChange={setOpen}
            >
                <AddCompanyPurchaseInfo
                    amountPeriod={totalPeriod}
                    title="زیادکردنی قیست"
                    handleClose={() => {
                        refetch()
                        setOpen(false)
                    }}
                />
            </CustomDialogWithTrigger>
            <Table className="w-full flex-1 mt-4">
                <TableCaption className="my-6">
                    <div className="w-full flex flex-wrap justify-center items-center gap-4">
                        {totalInfo.map((item) => (
                            <div key={item.title}>
                                <span className="text-sm">{item.title}:</span>
                                <Badge variant="secondary">
                                    {item.value}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </TableCaption>
                <TableCaption>
                    {purchaseInfo.length === 0 ? "هیچ قیستێک نەدراوەتەوە"
                        : `${purchaseInfo.length === 1 ? "تەنها پێشەکی دراوە" :
                            `جاری تر پارە دراوە${Number(purchaseInfo.length) - 1} پێشەکی لەگەڵ`}`}
                </TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">ژمارە</TableHead>
                        <TableHead>بڕ</TableHead>
                        <TableHead>بەروار</TableHead>
                        <TableHead className="text-center">تێبینی</TableHead>
                        <TableHead className="text-center">سڕینەوە</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {purchaseInfo.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{Number(item.id) === 1 ? "پێشەکی" : `${Number(item.id)}`}</TableCell>
                            <TableCell>{item.amount}</TableCell>
                            <TableCell>{new Date(item.date).toLocaleDateString('en-US')}</TableCell>
                            <TableCell className="text-center text-wrap max-w-96">{item.note}</TableCell>
                            <TableCell className="text-center">
                                <form id="deletePurchaseInfo" action={async () => {
                                    const { success, message } = await
                                        deleteCompanyPurchaseInfoActions(Number(item.id), companyPurchaseId)
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

