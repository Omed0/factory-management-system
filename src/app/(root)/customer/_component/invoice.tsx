'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OneSale } from '@/server/schema/sale'
import { useQuery } from '@tanstack/react-query'

interface InvoiceProps {
    sale: OneSale
}

export default function InvoiceComponent({ sale }: InvoiceProps) {
    //const { } = useQuery( )

    return (
        <Card className="w-full max-w-4xl mx-auto bg-white">
            <CardContent className="p-6">
                <div className="text-right mb-6" dir="rtl">
                    <h1 className="text-2xl font-bold mb-2 ">کۆمپانیای شکار</h1>
                    <h2 className="text-xl mb-4 ">کەشفی حساب (فرۆشتن)</h2>
                    <div className="flex justify-between mb-4 bg-violet-300 p-2">
                        <div>
                            <span className="font-bold">ژمارەی حساب: </span>
                            {sale.saleNumber}
                        </div>
                        <div>
                            <span className="font-bold">بەروار: </span>
                            {new Date(sale.saleDate).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div dir="rtl">
                    <Table className=''>
                        <TableHeader className="bg-violet-300">
                            <TableRow>
                                <TableHead className='h-10'>زنجیرە</TableHead>
                                <TableHead className='h-10'>کۆد</TableHead>
                                <TableHead className='h-10'>جۆر</TableHead>
                                <TableHead className='h-10'>دانە</TableHead>
                                <TableHead className='h-10'>نرخ</TableHead>
                                <TableHead className='h-10'>کۆ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/*{sale.map((item, index) => (
                                <TableRow key={item.id} className={index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                                    <TableCell>{item.id}</TableCell>
                                    <TableCell>{item.code}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{item.unitPrice}</TableCell>
                                    <TableCell>{item.total.toFixed(3)}</TableCell>
                                </TableRow>
                            ))}*/}
                        </TableBody>
                    </Table>

                    <div className="mt-4 bg-violet-300 p-3 space-y-1">
                        <div className="flex justify-between">
                            <div className="font-bold">کۆی گشتی:</div>
                            <div>{sale.totalRemaining.toFixed(3)}</div>
                        </div>
                        <div className="flex justify-between">
                            <div className="font-bold">داشکاندن:</div>
                            <div>{sale.discount.toFixed(3)}</div>
                        </div>
                        <div className="flex justify-between">
                            <div className="font-bold">کۆتایی:</div>
                            <div>{sale.totalAmount.toFixed(3)}</div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-sm text-gray-500 border rounded-lg p-3" dir="rtl">
                    <p>چاپکرا لە رۆژی: {new Date(sale.saleDate).toLocaleString()}</p>
                </div>
            </CardContent>
        </Card>
    )
}

