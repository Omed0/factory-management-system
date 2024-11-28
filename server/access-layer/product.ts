import 'server-only';

import {
    CreateProduct, createProductSchema, DeleteManyProduct, deleteManyProductSchema, DeleteProduct,
    deleteProductSchema, GetOneProduct, getProductSchema,
    UpdateProduct, updateProductSchema
} from '../schema/product';
import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';


export async function getOneProduct(pid: GetOneProduct) {
    return tryCatch(async () => {
        const data = getProductSchema.parse(pid)
        const result = await prisma.products.findFirst(
            { where: { id: data.id, deleted_at: null } });
        return result;
    })
}

export type GetListProduct = {
    isTrash?: boolean
}
export async function getListProduct({ isTrash }: GetListProduct = {}) {
    return tryCatch(async () => {
        const result = await prisma.products.findMany(
            {
                where: { deleted_at: isTrash === undefined ? undefined : isTrash === true ? { not: null } : null },
                orderBy: {
                    created_at: 'desc'
                }
            });

        return result;
    })
}


export async function createProduct(product: CreateProduct) {
    return tryCatch(async () => {
        const data = createProductSchema.parse(product)
        const result = await prisma.products.create({ data });
        return result;
    })
}
export async function updateProduct(data: UpdateProduct) {
    return tryCatch(async () => {
        const validatedData = updateProductSchema.parse(data)
        const result = await prisma.products.update({
            where: { id: validatedData.id, deleted_at: null },
            data: validatedData
        });
        return result;
    })
}

export async function deleteProduct(data: DeleteProduct) {
    return tryCatch(async () => {
        const validatedData = deleteProductSchema.parse(data)
        const result = await prisma.products.update({
            where: { id: validatedData.id, deleted_at: null },
            data: { deleted_at: new Date() }
        });
        return result;
    })
}

export async function deleteManyProduct(data: DeleteManyProduct) {
    return tryCatch(async () => {
        const validatedData = deleteManyProductSchema.parse(data)
        const result = await prisma.products.updateMany(
            {
                where: { id: { in: validatedData.ids }, deleted_at: null },
                data: { deleted_at: new Date() }
            });
        return result;
    })
}

export async function restoreProduct(data: DeleteProduct) {
    return tryCatch(async () => {
        const validatedData = deleteProductSchema.parse(data)
        const result = await prisma.products.update(
            {
                where: { id: validatedData.id, deleted_at: { not: null } },
                data: { deleted_at: null }
            });
        return result;
    })
}

export async function restoreManyProduct(data: DeleteManyProduct) {
    return tryCatch(async () => {
        const validatedData = deleteManyProductSchema.parse(data)
        const result = await prisma.products.updateMany(
            {
                where: { id: { in: validatedData.ids }, deleted_at: { not: null } },
                data: { deleted_at: null }
            });
        return result;
    })
}

export async function forceDeleteProduct(data: DeleteProduct) {
    return tryCatch(async () => {
        const validatedData = deleteProductSchema.parse(data)
        const result = await prisma.products.delete(
            { where: { id: validatedData.id } });
        return result;
    })
}

export async function forceDeleteManyProduct(data: DeleteManyProduct) {
    return tryCatch(async () => {
        const validatedData = deleteManyProductSchema.parse(data)
        const result = await prisma.products.deleteMany(
            { where: { id: { in: validatedData.ids } } });
        return result;
    })
}

