import { useCallback, useEffect } from 'react'
import { createProductSaleListActions } from '@/actions/sale';
import { CurrencyInput } from '@/components/custom-currency-input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input';
import { useDollar } from '@/hooks/useDollar';
import { OneProduct } from '@/server/schema/product';
import { CreateProductSale, createProductSaleSchema, OneSale } from '@/server/schema/sale';
import { zodResolver } from '@hookform/resolvers/zod';
import { ListRestart, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';



type Props = {
    product: OneProduct | null;
    resetSelectProduct: React.Dispatch<React.SetStateAction<OneProduct | null>>;
    invoice: OneSale
    listProduct: OneProduct[]
}

export default function AddCustomProduct({ product, resetSelectProduct, invoice, listProduct }: Props) {

    //const [open, setOpen] = useState(false);
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


    return (
        <Form {...form}>
            <form
                id='add-custom-product'
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex items-end flex-wrap gap-4"
            >
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="flex-1 basis-40">
                            <FormLabel>ناو</FormLabel>
                            <FormControl>
                                <Input {...field} list="productList" />
                            </FormControl>
                            <FormMessage />
                            <datalist id="productList">
                                {listProduct.slice(0, 10).map((pr) => (
                                    <option key={pr.id} value={pr.name} />
                                ))}
                            </datalist>
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
                <div className='flex gap-2'>
                    <Button
                        type="submit"
                        form='add-custom-product'
                        disabled={!form.formState.isValid}
                    >
                        <Plus className='size-5' />
                    </Button>
                    <Button
                        type="reset"
                        variant="destructive"
                        onClick={() => {
                            resetSelectProduct(null);
                            reset()
                        }}
                    >
                        <ListRestart className='size-5' />
                    </Button>
                </div>
            </form>
        </Form >
    )
}