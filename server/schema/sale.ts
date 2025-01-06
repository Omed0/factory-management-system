import { PaidLoans, SaleItems, Sales, SaleType } from '@prisma/client';
import { z } from 'zod';

// SALE TYPES

export type OneSale = Sales;
export type ListSale = Sales[];
export type CreateSale = z.infer<typeof createSaleSchema>;
export type UpdateSale = z.infer<typeof updateSaleSchema>;
export type GetOneSale = z.infer<typeof getOneSaleSchema>;
export type DeleteSale = z.infer<typeof deleteSaleSchema>;
export type RestoreSale = z.infer<typeof restoreSaleSchema>;

// SALE PRODUCT TYPES

export type OneProductSale = SaleItems;
export type ListProductSale = SaleItems[];
export type CreateProductSale = z.infer<typeof createProductSaleSchema>;
export type UpdateProductSale = z.infer<typeof updateProductSaleSchema>;
export type GetOneProductSale = z.infer<typeof getOneProductSaleSchema>;
export type GetListProductSale = z.infer<typeof getListProductSaleSchema>;
export type DeleteProductSale = z.infer<typeof deleteProductSaleSchema>;
export type RestoreProductSale = z.infer<typeof restoreProductSaleSchema>;

// SALE PRODUCT TYPES

export type OnePaidLoan = PaidLoans;
export type ListPaidLoan = PaidLoans[];
export type CreatePaidLoanSale = z.infer<typeof createPaidLoanSaleSchema>;
export type UpdatePaidLoanSale = z.infer<typeof updatePaidLoanSaleSchema>;
export type GetOnePaidLoanSale = z.infer<typeof getOnePaidLoanSaleSchema>;
export type DeletePaidLoanSale = z.infer<typeof deletePaidLoanSaleSchema>;
export type RestorePaidLoanSale = z.infer<typeof restorePaidLoanSaleSchema>;

// SALE SCHEMA

export const createSaleSchema = z
  .object({
    customerId: z.number().int().positive(),
    saleNumber: z
      .string()
      .regex(
        /^[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s-]+$/,
        'شیوازی نوسینی ناوی وەصڵ بگۆڕە'
      ),
    saleType: z.nativeEnum(SaleType),
    note: z.string().nullable().optional(),
    saleDate: z.date(),
    dollar: z.coerce.number().positive(),
  })
  .and(
    z.discriminatedUnion('saleType', [
      z.object({ saleType: z.literal('CASH') }),
      z.object({
        saleType: z.literal('LOAN'),
        monthlyPaid: z.coerce.number().positive(),
      }),
    ])
  );

export const updateSaleSchema = createSaleSchema.and(
  z.object({
    id: z.number().int().positive(),
  })
);

export const getOneSaleSchema = z.object({
  id: z.number().int(),
  customerId: z.number().int().positive(),
});

export const getListSaleSchema = z.object({
  customerId: z.number().int().positive(),
});

export const discountSaleSchema = z.object({
  discount: z.coerce.number().nonnegative(),
  saleId: z.number().int().positive(),
});

export const finishSaleSchema = z.object({
  isFinished: z.boolean(),
  saleId: z.number().int().positive(),
});

export const deleteSaleSchema = getOneSaleSchema;
export const restoreSaleSchema = getOneSaleSchema;

// PRODUCT SALE SCHEMA

export const createProductSaleSchema = z.object({
  saleId: z.number().int().positive(),
  productId: z.number().int().positive(),
  price: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  name: z.string().min(1).max(255),
});

export const changeProductQuantitySchema = z.object({
  id: z.number().int().positive(),
  amount: z.coerce.number().positive(),
});

export const updateProductSaleSchema = createProductSaleSchema.partial().and(
  z.object({
    id: z.number().int().positive(),
  })
);

export const getOneProductSaleSchema = z.object({
  id: z.number().int().positive(),
  saleId: z.number().int().positive(),
});

export const getListProductSaleSchema = z.object({
  saleId: z.number().int().positive(),
  customerId: z.number().int().positive(),
});

export const deleteProductSaleSchema = getOneProductSaleSchema;
export const restoreProductSaleSchema = getOneProductSaleSchema;

// SALE PAID LOAN

export const createPaidLoanSaleSchema = z.object({
  saleId: z.number().int().positive(),
  amount: z.coerce.number().positive(),
  paidDate: z.date().default(new Date()),
  note: z.string().nullable().optional(),
});

export const updatePaidLoanSaleSchema = createPaidLoanSaleSchema.partial().and(
  z.object({
    id: z.number().int().positive(),
  })
);

export const getOnePaidLoanSaleSchema = z.object({
  id: z.number().int().positive(),
  saleId: z.number().int().positive(),
});

export const getListPaidLoanSaleSchema = z.object({
  saleId: z.number().int().positive(),
});

export const deletePaidLoanSaleSchema = getOnePaidLoanSaleSchema;
export const restorePaidLoanSaleSchema = getOnePaidLoanSaleSchema;
