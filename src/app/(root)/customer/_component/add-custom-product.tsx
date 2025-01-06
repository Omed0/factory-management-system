import { createProductSaleListActions } from '@/actions/sale';
import { CurrencyInput } from '@/components/custom-currency-input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input';
import { useDollar } from '@/hooks/useDollar';
import { OneProduct } from '@/server/schema/product';
import { CreateProductSale, createProductSaleSchema, OneSale } from '@/server/schema/sale';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';



type Props = {
    product: OneProduct | null;
    resetSelectProduct: React.Dispatch<React.SetStateAction<OneProduct | null>>;
    invoice: OneSale
}

export default function AddCustomProduct({ product, resetSelectProduct, invoice }: Props) {

    const { data: { dollar } } = useDollar()
    const form = useForm<CreateProductSale>({
        mode: 'onSubmit',
        resolver: zodResolver(createProductSaleSchema),
        defaultValues: { saleId: invoice.id, quantity: 1, name: "", price: 0 },
    });

    const reset = useCallback(() => {
        form.reset(form.formState.defaultValues);
    }, [form]);

    async function onSubmit(values: CreateProductSale) {
        const newProduct = await createProductSaleListActions(values)

        if (!newProduct.success) {
            toast.error(newProduct.message);
        } else {
            toast.success(newProduct.message);
            resetSelectProduct(null);
            reset()
        }
    }

    useEffect(() => {
        if (product) {
            form.setValue('productId', product.id);
            form.setValue('name', product.name);
            form.setValue('price', product.price);
        }

        return () => reset()
    }, [product])

    console.log(form.formState.errors);

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex items-end flex-wrap gap-4"
            >
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-44">
                            <FormLabel>ناو</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <CurrencyInput
                    name='price'
                    form={form}
                    label='نرخ'
                    dollar={product?.dollar ?? dollar}
                    className='flex-1 basis-52'
                />
                <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-20">
                            <FormLabel>ژمارە(عدد)</FormLabel>
                            <FormControl>
                                <Input {...field} type='number' />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex gap-2">
                    <Button type="submit" className="" disabled={!form.formState.isValid}>
                        زیادکردن
                    </Button>
                    <Button
                        type="reset"
                        className=""
                        variant="outline"
                        onClick={() => {
                            resetSelectProduct(null);
                            reset()
                        }}
                    >
                        سڕینەوە
                    </Button>
                </div>
            </form>
        </Form>
    )
}