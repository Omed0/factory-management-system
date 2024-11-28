import 'server-only';

import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import {
    createCustomerSchema, deleteCustomerSchema,
    restoreCustomerSchema, UpdateCustomer, updateCustomerSchema
} from '../schema/customer';
import { CreateCustomer, getOneCustomerSchema } from '../schema/customer';

// Customer ACCESS LAYER

export async function getOneCustomer(id: number) {
    return tryCatch(async () => {
        const data = getOneCustomerSchema.parse(id)
        const Customer = await prisma.customers.findFirst({
            where: { id: data.id, deleted_at: null }
        });
        return Customer;
    })
}


export async function getCustomersList(trashed: boolean = false) {
    return tryCatch(async () => {
        const customers = await prisma.customers.findMany({
            where: { deleted_at: trashed ? { not: null } : null },
            orderBy: {
                created_at: 'desc'
            }
        });
        return customers;
    })
}

export async function createCustomer(dataCustomer: CreateCustomer) {
    return tryCatch(async () => {
        const data = createCustomerSchema.parse(dataCustomer);
        const Customer = await prisma.customers.create({
            data,
        });
        return Customer;
    })
}

export async function updateCustomer(dataCustomer: UpdateCustomer) {
    return tryCatch(async () => {
        const data = updateCustomerSchema.parse(dataCustomer);
        const { id, ...rest } = data;
        const Customer = await prisma.customers.update({
            where: { id, deleted_at: null },
            data: rest,
        });
        return Customer;
    })
}

export async function deleteCustomer(id: number) {
    return tryCatch(async () => {
        const data = deleteCustomerSchema.parse({ id });
        const Customer = await prisma.customers.update({
            where: { id: data.id, deleted_at: null },
            data: { deleted_at: new Date() }
        });
        return Customer;
    })
}

export async function restoreCustomer(id: number) {
    return tryCatch(async () => {
        const data = restoreCustomerSchema.parse({ id });
        const Customer = await prisma.customers.update({
            where: { id: data.id, deleted_at: { not: null } },
            data: { deleted_at: null }
        });
        return Customer;
    })
}

export async function forceDeleteCustomer(id: number) {
    return tryCatch(async () => {
        const data = deleteCustomerSchema.parse({ id });
        const Customer = await prisma.customers.delete({
            where: { id: data.id, deleted_at: { not: null } },
        });
        return Customer;
    })
}
