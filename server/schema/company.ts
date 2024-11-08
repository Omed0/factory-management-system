import { Companies, CompanyPurchaseType, Prisma, PurchasesInfo } from '@prisma/client';
import { z } from 'zod';
import { getCompanyListPurchaseActions, getCompanyOnePurchaseActions } from '@/actions/company';

// COMPANY SCHEMA

export type CreateCompany = z.infer<typeof createCompanySchema>;
export type UpdateCompany = z.infer<typeof updateCompanySchema>;
export type GetOneCompany = z.infer<typeof getOneCompanySchema>;
export type DeleteCompany = z.infer<typeof deleteCompanySchema>;
export type OneCompany = Companies;
export type ListCompany = Companies[];

export const createCompanySchema = z.object({
    name: z.string().min(3, 'ناوەکەت زۆر کورتە').max(100, 'ناوەکەت زۆر درێژە'),
    phone: z.string().min(6).max(16),
    address: z.string().min(3, 'ناونیشانەکەت زۆر کورتە').max(140, 'ناونیشانەکەت زۆر درێژە'),
});

export const updateCompanySchema = createCompanySchema.and(z.object({
    id: z.number().int().positive(),
}));


export const getOneCompanySchema = z.object({
    id: z.number().int().positive(),
});


export const deleteCompanySchema = getOneCompanySchema;
export const deleteManyCompanySchema = z.object({
    ids: z.array(z.number().int().positive()),
});


// COMPANY PURCHASE SCHEMA

export type CreateCompanyPurchase = z.infer<typeof createCompanyPurchaseSchema>;
export type UpdateCompanyPurchase = z.infer<typeof updateCompanyPurchaseSchema>;
export type GetOneCompanyPurchase = z.infer<typeof getOneCompanyPurchaseSchema>;
export type DeleteCompanyPurchase = z.infer<typeof deleteCompanyPurchaseSchema>;
export type OneCompanyPurchase = Prisma.PromiseReturnType<typeof getCompanyOnePurchaseActions>["data"];
export type ListCompanyPurchase = OneCompanyPurchase[];

export const createCompanyPurchaseSchema = z.object({
    name: z.string().min(3, 'ناوەکەت زۆر کورتە').max(100, 'ناوەکەت زۆر درێژە'),
    companyId: z.number().int().positive(),
    totalAmount: z.number().min(0, 'بڕی پارەکەت با لە سفر کەمترنەبێ').positive(),
    type: z.nativeEnum(CompanyPurchaseType),
    note: z.string().nullable().optional(),
    purchaseDate: z.date(),
}).and(
    z.discriminatedUnion("type", [
        z.object({ type: z.literal('CASH') }),
        z.object({
            type: z.literal('LOAN'),
            totalRemaining: z.number().min(0, 'بڕی پارەی پێشەکی نابێت کەمتر بێت لە سفر').positive(),
        }),
    ])
);

export const updateCompanyPurchaseSchema = createCompanyPurchaseSchema.and(z.object({
    id: z.number().int().positive(),
}));

export const getOneCompanyPurchaseSchema = z.object({
    id: z.number().int().positive(),
});

export const deleteCompanyPurchaseSchema = getOneCompanyPurchaseSchema.and(z.object({
    companyId: z.number().int().positive(),
}));

export const deleteManyCompanyPurchaseSchema = z.object({
    ids: z.array(z.number().int().positive()),
    companyId: z.number().int().positive(),
});


// COMPANY PURCHASE INFO SCHEMA

export type CreateCompanyPurchaseInfo = z.infer<typeof createCompanyPurchaseInfoSchema>;
export type UpdateCompanyPurchaseInfo = z.infer<typeof updateCompanyPurchaseInfoSchema>;
export type GetOneCompanyPurchaseInfo = z.infer<typeof getOneCompanyPurchaseInfoSchema>;
export type DeleteCompanyPurchaseInfo = z.infer<typeof deleteCompanyPurchaseInfoSchema>;
export type OneCompanyPurchaseInfo = PurchasesInfo;
export type ListCompanyPurchaseInfo = PurchasesInfo[];

export const createCompanyPurchaseInfoSchema = z.object({
    companyPurchaseId: z.number().int().positive(),
    amount: z.number().min(0, 'بڕی پارەکەت با لە سفر کەمتر نەبێت').positive(),
    date: z.date(),
    note: z.string().optional(),
});

export const updateCompanyPurchaseInfoSchema = createCompanyPurchaseInfoSchema.and(z.object({
    id: z.number().int().positive(),
}));

export const getOneCompanyPurchaseInfoSchema = z.object({
    id: z.number().int().positive(),
    companyPurchaseId: z.number().int().positive(),
});

export const getListCompanyPurchaseInfoSchema = z.object({
    companyPurchaseId: z.number().int().positive(),
});

export const deleteCompanyPurchaseInfoSchema = getOneCompanyPurchaseInfoSchema;