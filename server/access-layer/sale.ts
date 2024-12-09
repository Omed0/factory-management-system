import 'server-only';

import { tryCatch } from '@/lib/helper';
import {
  changeProductQuantitySchema,
  CreatePaidLoanSale,
  createPaidLoanSaleSchema,
  CreateProductSale,
  createProductSaleSchema,
  CreateSale,
  createSaleSchema,
  deletePaidLoanSaleSchema,
  deleteSaleSchema,
  discountSaleSchema,
  finishSaleSchema,
  getListPaidLoanSaleSchema,
  getListProductSaleSchema,
  getListSaleSchema,
  getOneSaleSchema,
  restoreSaleSchema,
  UpdateSale,
  updateSaleSchema,
} from '../schema/sale';
import { prisma } from '@/lib/client';
import { Prisma } from '@prisma/client';

async function getCustomerById(id: number, tx: Prisma.TransactionClient) {
  const customer = await tx.customers.findFirst({
    where: { id, deleted_at: null },
  });
  if (!customer) throw new Error('کڕیار نەدۆزرایەوە');
  return { customer };
}

async function getSalesByCustomerId(
  customerId: number,
  tx: Prisma.TransactionClient
) {
  const sales = await tx.sales.findMany({
    where: { customerId, customer: { deleted_at: null } },
  });
  if (!sales) throw new Error('وەصڵ نەدۆزرایەوە');
  if (!sales.length) throw new Error('ئەم کەسە وەصڵی نییە');
  return { sales };
}

async function getSaleById(
  { id, customerId }: { id: number; customerId: number },
  tx: Prisma.TransactionClient
) {
  const sale = await tx.sales.findFirst({
    where: {
      id,
      deleted_at: null,
      customerId,
      customer: { deleted_at: null },
    },
  });
  if (!sale) throw new Error('وەصڵ نەدۆزرایەوە');
  return { sale };
}

async function getPaidLoansBySaleId(
  saleId: number,
  tx: Prisma.TransactionClient
) {
  const loan = await tx.paidLoans.findMany({
    where: { saleId, sale: { deleted_at: null } },
  });
  if (!loan) throw new Error('قەرزەکانی ئەم وەصڵە نەدۆزرایەوە');
  if (!loan.length) throw new Error('ئەم وەصڵە هیچ قەرزێکی نییە');
  return { loan };
}

// SALE DATA LAYERS

export async function getCustomerOneSale({
  id,
  customerId,
}: {
  id: number;
  customerId: number;
}) {
  return tryCatch(async () => {
    const data = getOneSaleSchema.parse({ id, customerId });
    const result = await prisma.$transaction(async (tx) => {
      const [customer, sale] = await Promise.all([
        getCustomerById(data.customerId, tx),
        getSaleById({ id: data.id, customerId: data.customerId }, tx),
      ]);
      return { customer, sale };
    });

    return result;
  });
}

export async function getCustomerListSale({
  customerId,
  isTrash,
}: {
  customerId: number;
  isTrash: boolean;
}) {
  return tryCatch(async () => {
    const data = getListSaleSchema.parse({ customerId });
    const sales = await prisma.sales.findMany({
      where: {
        customerId: data.customerId,
        deleted_at: isTrash ? { not: null } : null,
      },
      orderBy: { created_at: 'desc' },
      include: { customer: true },
    });

    if (!sales) throw new Error('ئەم فرۆشتنانە نەدۆزرانەوە');

    return { sale: sales, name: sales?.[0]?.customer?.name };
  });
}

export async function createSaleForCustomer({
  saleValues,
}: {
  saleValues: CreateSale;
}) {
  return tryCatch(async () => {
    const data = createSaleSchema.parse({ ...saleValues });

    const sale = await prisma.$transaction(async (tx) => {
      const { customer } = await getCustomerById(data.customerId, tx);
      const newSale = await tx.sales.create({ data });
      return newSale;
    });

    if (!sale) throw new Error('هەڵەیەک ڕوویدا لە دروستکردنی وەصڵ');

    return sale;
  });
}

export async function updateSaleForCustomer({
  saleValues,
}: {
  saleValues: UpdateSale;
}) {
  return tryCatch(async () => {
    const { id: saleId, ...rest } = updateSaleSchema.parse({ ...saleValues });

    const sale = await prisma.$transaction(async (tx) => {
      const { customer } = await getCustomerById(rest.customerId, tx);
      const { sale } = await getSaleById(
        { id: saleId, customerId: customer.id },
        tx
      );

      if (sale.saleType !== rest.saleType)
        throw new Error(
          'گۆڕانکاری ناکرێت لە جۆری پارەدان، بەردەوامبە لەسەر شێوازی پێشوو'
        );

      const updatedSale = await tx.sales.update({
        where: { id: sale.id },
        data: rest,
      });

      return updatedSale;
    });

    return sale;
  });
}

export async function deleteSaleForCustomer({
  id,
  customerId,
}: {
  id: number;
  customerId: number;
}) {
  return tryCatch(async () => {
    const data = deleteSaleSchema.parse({ id, customerId });
    const sale = await prisma.sales.update({
      where: {
        id: data.id,
        customerId: data.customerId,
        deleted_at: null,
        customer: { deleted_at: null },
      },
      data: { deleted_at: new Date() },
    });

    if (!sale) throw new Error('هەڵەیەک ڕوویدا لە سڕینەوە وەصڵ');

    return sale;
  });
}

export async function restoreSaleForCustomer({
  id,
  customerId,
}: {
  id: number;
  customerId: number;
}) {
  return tryCatch(async () => {
    const data = restoreSaleSchema.parse({ id, customerId });
    const sale = await prisma.sales.update({
      where: {
        id: data.id,
        customerId: data.customerId,
        deleted_at: { not: null },
      },
      data: { deleted_at: null },
    });

    if (!sale) throw new Error('هەڵەیەک ڕوویدا لە گەڕاندنەوەی وەصڵ');

    return sale;
  });
}

export async function forceDeleteSaleForCustomer({
  id,
  customerId,
}: {
  id: number;
  customerId: number;
}) {
  return tryCatch(async () => {
    const data = restoreSaleSchema.parse({ id, customerId });
    const sale = await prisma.sales.delete({
      where: {
        id: data.id,
        customerId: data.customerId,
        deleted_at: { not: null },
      },
    });

    if (!sale) throw new Error('هەڵەیەک ڕوویدا لە سڕینەوەی وەصڵ');

    return sale;
  });
}

export async function discountForSaleInvoice({
  id,
  discount,
}: {
  id: number;
  discount: number;
}) {
  return tryCatch(async () => {
    const data = discountSaleSchema.parse({ saleId: id, discount });
    const sale = await prisma.sales.update({
      where: {
        id: data.saleId,
        deleted_at: null,
        isFinished: false,
        totalAmount: { gte: data.discount },
      },
      data: { discount: data.discount },
    });
    if (!sale) throw new Error('هەڵەیەک ڕوویدا لە داشکاندن');

    return sale;
  });
}

export async function finishSaleInvoice({
  id,
  isFinished,
}: {
  id: number;
  isFinished: boolean;
}) {
  return tryCatch(async () => {
    const data = finishSaleSchema.parse({ saleId: id, isFinished });
    const currentSale = await prisma.sales.findFirst({
      where: { id: data.saleId, deleted_at: null, isFinished: false },
    });

    if (!currentSale) throw new Error('ئەم وەصڵە نەدۆزرایەوە');

    const isCash = currentSale.saleType === 'CASH';

    if (isCash) {
      const sale = await prisma.sales.update({
        where: { id: data.saleId },
        data: {
          isFinished: data.isFinished,
          totalRemaining: currentSale.totalAmount,
        },
      });
      await prisma.boxes.update({
        where: { id: 1 },
        data: {
          amount: { increment: currentSale.totalAmount - currentSale.discount },
        },
      });

      return sale;
    }

    return currentSale;
  });
}

// SALE PRODUCT DATA LAYERS

export async function getProductSaleList({
  saleId,
  customerId,
}: {
  saleId: number;
  customerId: number;
}) {
  return tryCatch(async () => {
    if (!saleId) throw new Error('هیچ وەصڵێک هەڵنەبژێردراوە');
    const data = getListProductSaleSchema.parse({ saleId, customerId });
    const sale = await prisma.sales.findFirst({
      where: {
        id: data.saleId,
        customerId: data.customerId,
        isFinished: false,
        deleted_at: null,
        customer: { deleted_at: null },
      },
    });

    if (!sale) throw new Error('ئەم وەصڵە بوونی نییە یان تەواو بووە');

    const productSale = await prisma.saleItems.findMany({
      where: { saleId: sale.id },
    });

    const productIds = new Set(
      productSale
        .map((item) => item.productId)
        .filter((id): id is number => id !== null)
    );

    const allProductsWithSameId = await prisma.saleItems.findMany({
      where: {
        productId: { in: Array.from(productIds) },
        saleId: sale.id,
      },
      include: { product: true },
    });

    if (!allProductsWithSameId)
      throw new Error('مەوادەکانی ناو ئەم وەصڵە نەدۆزرانەوە');

    return { productSale: allProductsWithSameId, sale };
  });
}

export async function createProductSaleList({
  product,
}: {
  product: CreateProductSale;
}) {
  return tryCatch(async () => {
    const data = createProductSaleSchema.parse({ ...product });
    // Check if the product already exists in the sale
    const newProduct = await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.saleItems.findFirst({
        where: {
          saleId: data.saleId,
          productId: data.productId,
          sale: { deleted_at: null },
        },
      });
      if (existingProduct) {
        // If it exists, increase the quantity
        return increaseQuantitySaleItem({
          id: existingProduct.id,
          amount: data.quantity,
        });
      } else {
        // If it doesn't exist, create a new product sale
        const saleItem = await tx.saleItems.create({ data });
        await tx.sales.update({
          where: { id: saleItem.saleId },
          data: {
            totalAmount: { increment: saleItem.price * saleItem.quantity },
          },
        });
        if (!saleItem) throw new Error('هەڵەیەک ڕوویدا لە زیادکردنی مەواد');
        return saleItem;
      }
    });

    return newProduct || {}; // Ensure it returns an object
  });
}

// New function to increase product quantity
export async function increaseQuantitySaleItem({
  id,
  amount,
}: {
  id: number;
  amount: number;
}) {
  return tryCatch(async () => {
    const data = changeProductQuantitySchema.parse({ id, amount });
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const updateItemInSale = await tx.saleItems.update({
        where: { id: data.id },
        data: { quantity: { increment: data.amount } },
      });
      await tx.sales.update({
        where: { id: updateItemInSale.saleId },
        data: {
          totalAmount: { increment: updateItemInSale.price * data.amount },
        },
      });

      if (!updateItemInSale)
        throw new Error('هەڵەیەک ڕوویدا لە زیادکردنی مەواد');
      return updateItemInSale; // Ensure it returns the updated item
    });

    return updatedProduct || {}; // Ensure it returns an object
  });
}

// Updated decreaseProductQuantity function
export async function decreaseQuantitySaleItem({
  id,
  amount,
}: {
  id: number;
  amount: number;
}) {
  return tryCatch(async () => {
    const data = changeProductQuantitySchema.parse({ id, amount });
    const currentProduct = await prisma.$transaction(async (tx) => {
      const findSaleItem = await tx.saleItems.findUnique({
        where: { id: data.id },
      });

      if (findSaleItem) {
        if (findSaleItem.quantity === 1) {
          // If quantity is 1, delete the product sale
          return await deleteProductSaleItem({ id: data.id });
        } else if (findSaleItem.quantity > 1) {
          // Decrease the quantity if it's greater than 1
          const updatedProduct = await tx.saleItems.update({
            where: { id },
            data: { quantity: { decrement: data.amount } },
          });

          if (!updatedProduct)
            throw new Error('هەڵەیەک ڕوویدا لە کەمکردنەوەی دانە');
          await tx.sales.update({
            where: { id: updatedProduct.saleId },
            data: {
              totalAmount: { decrement: updatedProduct.price * data.amount },
            },
          });
          return updatedProduct; // Ensure it returns the updated product
        }
      }
      return {}; // Return an empty object if no sale item is found
    });

    return currentProduct || {}; // Ensure it returns an object
  });
}

// New function to delete a product sale
export async function deleteProductSaleItem({ id }: { id: number }) {
  return tryCatch(async () => {
    const deletedProduct = await prisma.$transaction(async (tx) => {
      const saleItemProduct = await tx.saleItems.delete({
        where: { id },
      });
      await tx.sales.update({
        where: { id: saleItemProduct.saleId },
        data: {
          totalAmount: {
            decrement: saleItemProduct.price * saleItemProduct.quantity,
          },
        },
      });

      if (!saleItemProduct) throw new Error('هەڵەیەک ڕوویدا لە سڕینەوەی مەواد');
      return saleItemProduct; // Ensure it returns the deleted product
    });

    return deletedProduct || {}; // Ensure it returns an object
  });
}

// SALE PAID LOAN DATA LAYERS

export async function getPaidLoanSaleList({ saleId }: { saleId: number }) {
  return tryCatch(async () => {
    const data = getListPaidLoanSaleSchema.parse({ saleId });
    const sale = await prisma.sales.findFirst({
      where: { id: data.saleId, deleted_at: null },
    });
    if (!sale) throw new Error('ئەم وەصڵە نەدۆزرایەوە');

    const loan = await prisma.paidLoans.findMany({
      where: { saleId: sale.id },
    });
    if (!loan) throw new Error('قەرزی ناو ئەم وەصڵە نەدۆزرایەوە');

    return { loan, sale };
  });
}

export async function createPaidLoanSaleList({
  paidLoanInfo,
}: {
  paidLoanInfo: CreatePaidLoanSale;
}) {
  return tryCatch(async () => {
    const data = createPaidLoanSaleSchema.parse({ ...paidLoanInfo });
    const loan = await prisma.$transaction(async (tx) => {
      const totalAmount = await tx.paidLoans.aggregate({
        _sum: { amount: true },
        where: { saleId: data.saleId },
      });

      const sale = await tx.sales.findUnique({
        where: { id: data.saleId },
        select: { discount: true },
      });

      const adjustedTotalAmount =
        (totalAmount._sum.amount || 0) - (sale?.discount || 0);
      const isLessThanTotalAmount = adjustedTotalAmount + data.amount;

      await tx.sales.update({
        where: {
          id: data.saleId,
          deleted_at: null,
          totalAmount: { gte: isLessThanTotalAmount },
        },
        data: { totalRemaining: { increment: data.amount } },
      });
      const createLoan = await tx.paidLoans.create({ data });

      if (!createLoan) throw new Error('هەڵەیەک ڕوویدا');
      await tx.boxes.update({
        where: { id: 1 },
        data: { amount: { increment: createLoan.amount } },
      });
      return createLoan;
    });

    if (!loan) throw new Error('هەڵەیەک ڕوویدا لە زیادکردنی قەرز');

    return loan;
  });
}

export async function deletePaidLoanSaleList({
  id,
  saleId,
}: {
  id: number;
  saleId: number;
}) {
  return tryCatch(async () => {
    const data = deletePaidLoanSaleSchema.parse({ id, saleId });
    const loan = await prisma.$transaction(async (tx) => {
      const deletedLoan = await tx.paidLoans.delete({
        where: { id: data.id, saleId: data.saleId },
      });
      if (!deletedLoan) throw new Error('هەڵەیەک ڕوویدا');
      await tx.sales.update({
        where: { id: data.saleId },
        data: { totalRemaining: { decrement: deletedLoan.amount } },
      });
      await tx.boxes.update({
        where: { id: 1 },
        data: {
          amount: { decrement: deletedLoan.amount },
        },
      });
      return deletedLoan;
    });

    if (!loan) throw new Error('هەڵەیەک ڕوویدا لە زیادکردنی قەرز');

    return loan;
  });
}
