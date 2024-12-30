'use server';

import { revalidatePath } from 'next/cache';

import {
  createProduct,
  deleteManyProduct,
  deleteProduct,
  forceDeleteManyProduct,
  forceDeleteProduct,
  getListProduct,
  getOneProduct,
  restoreManyProduct,
  restoreProduct,
  updateProduct,
} from '@/server/access-layer/product';
import { CreateProduct, UpdateProduct } from '@/server/schema/product';

export async function getOneProductActions(id: number) {
  const product = await getOneProduct({ id });
  if (product === null || 'error' in product) {
    return { success: false, message: product?.error || 'مەواد نەدۆزرایەوە' };
  }
  return { success: true, data: product };
}

export async function getListProductActions({
  isTrash,
}: {
  isTrash?: boolean;
}) {
  const products = await getListProduct({ isTrash });
  if ('error' in products) {
    return { success: false, message: products.error };
  }
  return { success: true, data: products };
}

export async function createProductActions(data: CreateProduct) {
  const product = await createProduct(data);
  if ('error' in product) {
    return { success: false, message: product.error };
  }
  revalidatePath('/product');
  return { success: true, message: 'مەواد زیادکرا بەسەرکەوتووی' };
}

export async function updateProductActions(id: number, data: UpdateProduct) {
  const product = await updateProduct(id, data);
  if ('error' in product) {
    return { success: false, message: product.error };
  }
  revalidatePath('/product');
  return { success: true, message: 'نوێکرایەوە بەسەرکەوتووی' };
}

export async function deleteProductActions(id: number) {
  const product = await deleteProduct({ id });
  if ('error' in product) {
    return { success: false, message: product.error };
  }
  revalidatePath('/product');
  return { success: true, message: 'سڕایەوە بەسەرکەوتووی' };
}

export async function deleteManyProductActions(ids: number[]) {
  const product = await deleteManyProduct({ ids });
  if ('error' in product) {
    return { success: false, message: product.error };
  }
  revalidatePath('/product');
  return { success: true, message: 'سڕانەوە بەسەرکەوتووی' };
}

export async function restoreProductActions(id: number) {
  const product = await restoreProduct({ id });
  if ('error' in product) {
    return { success: false, message: product.error };
  }
  revalidatePath('/product');
  return { success: true, message: 'گەڕێندرایەوە بەسەرکەوتووی' };
}

export async function restoreManyProductActions(ids: number[]) {
  const product = await restoreManyProduct({ ids });
  if ('error' in product) {
    return { success: false, message: product.error };
  }
  revalidatePath('/product');
  return { success: true, message: 'گەڕێندرانەوە بەسەرکەوتووی' };
}

export async function forceDeleteProductActions(id: number) {
  const product = await forceDeleteProduct({ id });
  if ('error' in product) {
    return { success: false, message: product.error };
  }
  revalidatePath('/product');
  return { success: true, message: 'بەتەواوی سڕایەوە' };
}

export async function forceDeleteManyProductActions(ids: number[]) {
  const product = await forceDeleteManyProduct({ ids });
  if ('error' in product) {
    return { success: false, message: product.error };
  }
  revalidatePath('/product');
  return { success: true, message: 'بەتەواوی سڕانەوە' };
}
