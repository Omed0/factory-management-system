import { Customers } from '@prisma/client';
import { z } from 'zod';

// CUSTOMER SCHEMA
export type CreateCustomer = z.infer<typeof createCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;
export type GetOneCustomer = z.infer<typeof getOneCustomerSchema>;
export type DeleteCustomer = z.infer<typeof deleteCustomerSchema>;
export type OneCustomer = Customers;
export type ListCustomer = Customers[];

export const createCustomerSchema = z.object({
    name: z.string().min(3, 'ناوەکەت زۆر کورتە').max(100, 'ناوەکەت زۆر درێژە'),
    phone: z.string().min(6).max(20),
    address: z.string().min(3, 'ناونیشانەکەت زۆر کورتە').max(140, 'ناونیشانەکەت زۆر درێژە'),
    isSalariedeEmployee: z.boolean().default(false).optional()
});

export const updateCustomerSchema = createCustomerSchema.and(z.object({
    id: z.number().int().positive(),
}));


export const getOneCustomerSchema = z.object({
    id: z.number().int().positive(),
});


export const deleteCustomerSchema = getOneCustomerSchema;
export const restoreCustomerSchema = getOneCustomerSchema
