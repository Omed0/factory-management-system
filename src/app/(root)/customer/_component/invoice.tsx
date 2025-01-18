'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OneSale } from '@/server/schema/sale'
import { forwardRef } from 'react'
import { useInvoiceData } from '../[id]/useInvoiceData'
import useConvertCurrency from '@/hooks/useConvertCurrency'
import useSetQuery from '@/hooks/useSetQuery'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

interface InvoiceProps {
    sale: OneSale
}

const footerInfo = [
    { name: "چاپکرا لە ڕۆژی", value: new Date().toLocaleString() },
    { name: "ناونیشان", value: "دەربەندیخان -شەقامی کانی سارد / بەرامبەر مەشتەلەکە" },
    { name: "پەیوەندی", value: "07725425600" },
    { name: "پەیوەندی", value: "07503590506" },
]

const InvoiceComponent = forwardRef<HTMLDivElement, InvoiceProps>(({ sale }, ref) => {
    const { searchParams } = useSetQuery()
    const currency = searchParams.get("currency") || "USD"

    const { data, error, isError, isLoading } = useInvoiceData({ sale })

    const loan = ((data?.totalAmount || 0) - (data?.discount || 0)) - (data?.totalRemaining || 0)
    const header = [
        { name: "ژ.وەصڵ", value: data?.id },
        { name: "جۆری وەصڵ", value: data?.saleType === "CASH" ? "نەقد" : "قەرز" },
        { name: "ڕۆژ", value: data?.saleDate.toLocaleDateString('en-GB') },
        { name: "داشکاندن", value: useConvertCurrency(data?.discount || 0, sale.dollar) },
        { name: "کۆی گشتی", value: useConvertCurrency(data?.totalAmount || 0, sale.dollar) },
        { name: "بڕی دراو", value: useConvertCurrency(data?.totalRemaining || 0, sale.dollar) },
        { name: "قەرز", value: useConvertCurrency(loan, sale.dollar) },
    ]

    if (isError || !data) {
        return (
            <div>{error?.message || "هەڵەیەک هەیە"}</div>
        )
    }

    if (isLoading) {
        return (
            <div>Loading...</div>
        )
    }

    return (
        <Card ref={ref} className="w-full h-svh max-w-4xl mx-auto bg-white text-black">
            <CardContent className="flex flex-col justify-between h-full w-full p-4">
                <div>
                    <div className="text-right">
                        <div className='flex items-start justify-between'>
                            <div className='flex items-center gap-2'>
                                <Image
                                    src={'/images/logo.jpg'}
                                    className='object-contain aspect-square size-16'
                                    alt='logo'
                                    width={400}
                                    height={400}
                                    quality={100}
                                />
                                <div>
                                    <h1 className="text-2xl font-bold text-primary">زانیار گرووپ</h1>
                                    <p className='text-card-foreground/80 max-w-md'>دروستکردنی کەوانتەر و دەرگا و پەنجەرەی ئەلەمنیۆم و پلاستیک و شوشە</p>
                                </div>
                            </div>
                            <div className="flex gap-3 font-semibold border rounded-md bg-violet-100 p-1.5">
                                <p>خاوەن حساب:</p>
                                <p>{data.customer?.name}</p>
                            </div>
                        </div>
                        <div className='w-full flex mt-4'>
                            {header.map((h) => (
                                <div key={h.name} className='w-full flex flex-col'>
                                    <h3 className="bg-indigo-900 text-white p-1 border-e-2 text-center">{h.name}</h3>
                                    <p className='bg-violet-300 p-1 border-e-2 text-center'>{h.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Table className='border-2 border-indigo-900'>
                            <TableHeader className="border-2 border-indigo-900">
                                <TableRow>
                                    <TableHead className='h-10 border border-indigo-900 text-center font-semibold'>زنجیرە</TableHead>
                                    <TableHead className='h-10 border border-indigo-900 text-center font-semibold'>جۆر</TableHead>
                                    <TableHead className='h-10 border border-indigo-900 text-center font-semibold'>دانە</TableHead>
                                    <TableHead className='h-10 border border-indigo-900 text-center font-semibold'>نرخ</TableHead>
                                    <TableHead className='h-10 border border-indigo-900 text-center font-semibold'>کۆ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.saleItems.map((item, i) => (
                                    <TableRow key={item.id}>
                                        <TableCell className='p-1 text-center'>{i + 1}</TableCell>
                                        <TableCell className='p-1 text-center'>{item.name}</TableCell>
                                        <TableCell className='p-1 text-center'>{item.quantity}</TableCell>
                                        <TableCell className='p-1 text-center'>{formatCurrency(item.price, sale.dollar, currency)}</TableCell>
                                        <TableCell className='p-1 text-center'>{formatCurrency(item.price * item.quantity, sale.dollar, currency)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>


                <div className="mt-8 text-sm w-full">
                    <Table className=''>
                        <TableHeader>
                            <TableRow>
                                {footerInfo.map((f) => (
                                    <TableHead className='h-6 border-2 text-indigo-700' key={f.name}>{f.name}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                {footerInfo.map((f) => (
                                    <TableCell className='p-1 border-2' key={f.name}>{f.value}</TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
})

export default InvoiceComponent