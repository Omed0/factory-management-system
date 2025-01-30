'use server';

import { revalidatePath } from 'next/cache';

import {
  createPaidLoanSaleList,
  createProductSaleList,
  createSaleForCustomer,
  decreaseQuantitySaleItem,
  deletePaidLoanSaleList,
  deleteProductSaleItem,
  deleteSaleForCustomer,
  discountForSaleInvoice,
  finishSaleInvoice,
  forceDeleteSaleForCustomer,
  getCustomerListSale,
  getCustomerOneSale,
  getPaidLoanSaleList,
  getProductSaleList,
  getProductWithSaleWithcustomerForInvoice,
  increaseQuantitySaleItem,
  restoreSaleForCustomer,
  updateSaleForCustomer,
} from '@/server/access-layer/sale';
import {
  CreatePaidLoanSale,
  CreateProductSale,
  CreateSale,
  UpdateSale,
} from '@/server/schema/sale';

// SALE ACTIONS

export async function getCustomerOneSaleActions(id: number, custId: number) {
  const sale = await getCustomerOneSale({ id, customerId: custId });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error ?? 'وەصڵ نەدۆزرایەوە',
    };
  }
  return { success: true, data: sale };
}

export async function getCustomerListSaleActions(
  customerId: number,
  isTrash: boolean = false
) {
  const sale = await getCustomerListSale({ customerId, isTrash });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error ?? 'هەڵەیەک ڕوویدا',
    };
  }
  return { success: true, data: sale };
}

export async function createSaleForCustomerActions(data: CreateSale) {
  const sale = await createSaleForCustomer({ saleValues: data });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error ?? 'هەڵەیەک ڕوویدا',
    };
  }
  revalidatePath('/customer/[id]', 'page');
  return { success: true, message: 'وەصڵ دروستکرا' };
}

export async function updateSaleForCustomerActions(data: UpdateSale) {
  const sale = await updateSaleForCustomer({ saleValues: data });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error ?? 'هەڵەیەک ڕوویدا',
    };
  }
  revalidatePath('/customer/[id]', 'page');
  return { success: true, message: 'گۆڕانکاری سەرکەوتبوو' };
}

export async function deleteSaleForCustomerActions(id: any) {
  const sale = await deleteSaleForCustomer({ id });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error ?? 'هەڵەیەک ڕوویدا',
    };
  }
  revalidatePath('/customer/[id]', 'page');
  return { success: true, message: 'وەصڵ ئەرشیفکرا' };
}

export async function restoreSaleForCustomerActions(id: any) {
  const sale = await restoreSaleForCustomer({ id });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error,
    };
  }
  revalidatePath('/customer/[id]', 'page');
  return { success: true, message: 'وەصڵ گەڕێندرایەوە' };
}

export async function forceDeleteSaleForCustomerActions(id: any) {
  const sale = await forceDeleteSaleForCustomer({ id });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error,
    };
  }
  revalidatePath('/customer/[id]', 'page');
  return { success: true, message: 'وەصڵ بەتەواوی سڕایەوە' };
}

export async function discountSaleActions(id: any, discount: number) {
  const sale = await discountForSaleInvoice({ id, discount });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error || 'هەڵەیەک هەیە',
    };
  }
  revalidatePath('/customer/[id]/sale', 'page');
  return { success: true, message: 'داشکاندن کرا' };
}

export async function finishSaleActions(id: any, isFinished: boolean) {
  const sale = await finishSaleInvoice({ id, isFinished });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error || 'هەڵەیەک هەیە',
    };
  }
  //revalidatePath('/customer/[id]', 'page'); // instead this use dynamic varibale in page invoices customer
  //this is why not using this have a some function use both in inoivces and sales page if revalidate it will be a problem
  return { success: true, message: 'وەصڵ تەواو کرا' };
}

// SALE PRODUCT ACTIONS

export async function getProductSaleListActions(saleId: number) {
  const SaleWithProducts = await getProductSaleList({ saleId });
  if (SaleWithProducts === null || 'error' in SaleWithProducts) {
    return {
      success: false,
      message: SaleWithProducts?.error ?? 'هەڵەیەک ڕوویدا',
    };
  }
  return { success: true, SaleWithProducts };
}

export async function getProductWithSaleWithcustomerForInvoiceActions(
  saleId: number
) {
  const sale = await getProductWithSaleWithcustomerForInvoice({
    saleId,
  });
  if (sale === null || 'error' in sale) {
    return {
      success: false,
      message: sale?.error ?? 'هەڵەیەک ڕوویدا',
    };
  }
  return { success: true, sale };
}

export async function createProductSaleListActions(data: CreateProductSale) {
  const product = await createProductSaleList({ product: data });
  if (product === null || 'error' in product) {
    return {
      success: false,
      message: product?.error,
    };
  }
  revalidatePath('/customer/[id]/sale', 'page');
  return { success: true, message: 'مەواد زیادکرا' };
}

export async function deleteProductEntrlyActions(id: number) {
  const product = await deleteProductSaleItem({ id });
  if (product === null || 'error' in product) {
    return {
      success: false,
      message: product?.error,
    };
  }
  revalidatePath('/customer/[id]/sale', 'page');
  return { success: true, message: 'مەواد سڕایەوە' };
}

export async function increaseProductQuantityActions(
  id: number,
  amount: number
) {
  const product = await increaseQuantitySaleItem({ id, amount });
  if (product === null || 'error' in product) {
    return {
      success: false,
      message: product?.error,
    };
  }
  revalidatePath('/customer/[id]/sale', 'page');
  return { success: true, message: 'مەواد زیادکرا' };
}

export async function decreaseProductQuantityActions(
  id: number,
  amount: number
) {
  const product = await decreaseQuantitySaleItem({ id, amount });
  if (product === null || 'error' in product) {
    return {
      success: false,
      message: product?.error,
    };
  }
  revalidatePath('/customer/[id]/sale', 'page');
  return { success: true, message: 'مەواد کەم کرایەوە' };
}

// SALE PAID LOAN ACTIONS

export async function getPaidLoanSaleListActions(saleId: number) {
  const loan = await getPaidLoanSaleList({ saleId });
  if (loan === null || 'error' in loan) {
    return {
      success: false,
      message: loan?.error ?? 'هەڵەیەک ڕوویدا',
    };
  }
  return { success: true, data: loan };
}

export async function createPaidLoanSaleListActions(data: CreatePaidLoanSale) {
  const loan = await createPaidLoanSaleList({ paidLoanInfo: data });
  if (loan === null || 'error' in loan) {
    return {
      success: false,
      message: loan?.error ?? 'هەڵەیەک ڕوویدا',
    };
  }
  revalidatePath('/customer/[id]', 'page');
  return { success: true, message: 'قەرز زیادکرا' };
}

export async function deletePaidLoanSaleListActions(
  id: number,
  saleId: number
) {
  const loan = await deletePaidLoanSaleList({ id, saleId });
  if (loan === null || 'error' in loan) {
    return {
      success: false,
      message: loan?.error ?? 'هەڵەیەک ڕوویدا',
    };
  }
  revalidatePath('/customer/[id]', 'page');
  return { success: true, message: 'قەرز سڕایەوە' };
}
