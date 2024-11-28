import 'server-only';

import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import {
    CreateCompany, CreateCompanyPurchase,
    CreateCompanyPurchaseInfo, createCompanyPurchaseInfoSchema,
    createCompanyPurchaseSchema, createCompanySchema,
    deleteCompanyPurchaseInfoSchema,
    deleteCompanyPurchaseSchema,
    deleteCompanySchema,
    getListCompanyPurchaseInfoSchema,
    getOneCompanyByNameSchema,
    getOneCompanyPurchaseInfoSchema,
    getOneCompanyPurchaseSchema,
    getOneCompanySchema,
    UpdateCompany,
    UpdateCompanyPurchase,
    UpdateCompanyPurchaseInfo,
    updateCompanyPurchaseInfoSchema,
    updateCompanyPurchaseSchema,
    updateCompanySchema
} from '../schema/company';

// COMPANY ACCESS LAYER

export async function getOneCompany(id: number) {
    return tryCatch(async () => {
        const data = getOneCompanySchema.parse({ id })
        const company = await prisma.companies.findFirst({
            where: { id: data.id, deleted_at: null }
        });
        return company;
    })
}


export async function getCompanyBySlug(slug: string) {
    return tryCatch(async () => {
        const data = getOneCompanyByNameSchema.parse({ name: slug })
        const company = await prisma.companies.findFirst({
            where: { name: data.name, deleted_at: null }
        });
        return company;
    })
}


export async function getCompaniesList(trashed: boolean = false) {
    return tryCatch(async () => {
        const companies = await prisma.companies.findMany({
            where: { deleted_at: trashed ? { not: null } : null },
            orderBy: {
                created_at: 'desc'
            }
        });
        return companies;
    })
}

export async function createCompany(dataCompany: CreateCompany) {
    return tryCatch(async () => {
        const data = createCompanySchema.parse({ ...dataCompany });
        const company = await prisma.companies.create({
            data,
        });
        return company;
    })
}

export async function updateCompany(dataCompany: UpdateCompany) {
    return tryCatch(async () => {
        const data = updateCompanySchema.parse({ ...dataCompany });
        const { id, ...rest } = data;
        const company = await prisma.companies.update({
            where: { id, deleted_at: null },
            data: rest,
        });
        return company;
    })
}

export async function deleteCompany(id: number) {
    return tryCatch(async () => {
        const data = deleteCompanySchema.parse({ id });
        const company = await prisma.companies.update({
            where: { id: data.id, deleted_at: null },
            data: { deleted_at: new Date() }
        });
        return company;
    })
}

export async function restoreCompany(id: number) {
    return tryCatch(async () => {
        const data = deleteCompanySchema.parse({ id });
        const company = await prisma.companies.update({
            where: { id: data.id, deleted_at: { not: null } },
            data: { deleted_at: null }
        });
        return company;
    })
}

export async function forceDeleteCompany(id: number) {
    return tryCatch(async () => {
        const data = deleteCompanySchema.parse({ id });
        const company = await prisma.companies.delete({
            where: { id: data.id, deleted_at: { not: null } },
        });
        return company;
    })
}


// COMPANY PURCHASE ACCESS LAYER

export async function getCompanyOnePurchase(companyId: number) {
    return tryCatch(async () => {
        const company = await getOneCompany(companyId);
        if (!company || "error" in company) throw new Error('کۆمپانیا نەدۆزرایەوە');
        const companyPurchase = await prisma.companyPurchase.findFirstOrThrow({
            where: { id: company.id, deleted_at: null, company: { deleted_at: null } },
            select: {
                id: true,
                name: true,
                companyId: true,
                totalAmount: true,
                totalRemaining: true,
                type: true,
                note: true,
                purchaseDate: true,
                deleted_at: true,
                created_at: true,
                updated_at: true,
                company: {
                    select: {
                        name: true
                    }
                },
            },
            orderBy: {
                created_at: 'desc'
            }
        });
        return companyPurchase;
    })
}

export async function getCompanyListPurchase(id: number, trashed: boolean) {
    return tryCatch(async () => {
        const company = await getOneCompany(id);
        if (!company || "error" in company) throw new Error(company?.error || 'کۆمپانیا نەدۆزرایەوە');
        const companyPurchase = await prisma.companyPurchase.findMany({
            where: {
                companyId: company.id,
                deleted_at: trashed ? { not: null } : null,
                company: { deleted_at: null }
            },
            select: {
                id: true,
                name: true,
                companyId: true,
                totalAmount: true,
                totalRemaining: true,
                type: true,
                note: true,
                purchaseDate: true,
                deleted_at: true,
                created_at: true,
                updated_at: true,
                company: {
                    select: {
                        name: true
                    }
                },
            }
        });

        return companyPurchase;
    })
}

export async function createCompanyPurchase(dataCompanyPurchase: CreateCompanyPurchase) {
    return tryCatch(async () => {
        const data = createCompanyPurchaseSchema.parse(dataCompanyPurchase);

        if (data.type === "LOAN" && data.totalAmount < data.totalRemaining) {
            throw new Error('کۆی گشتی نابێت کەمتر بێت لە پارەی پێشەکی');
        }

        const companyPurchase = await prisma.$transaction(async (tx) => {
            const company = await tx.companies.findFirst({
                where: { id: data.companyId, deleted_at: null }
            })
            if (!company) throw new Error('کۆمپانیا نەدۆزرایەوە');
            let amount = 0
            if (data.type === "CASH") {
                amount = data.totalAmount;
                (data as any).totalRemaining = (data as any).totalAmount
            } else {
                amount = data.totalRemaining
            }
            const newCompanyPurchase = await tx.companyPurchase.create({ data });

            if (newCompanyPurchase.type === "LOAN") {
                await createCompanyPurchaseInfo({
                    amount: newCompanyPurchase.totalRemaining,
                    companyPurchaseId: newCompanyPurchase.id,
                    note: data.note,
                    date: data.purchaseDate,
                })
            }

            await tx.boxes.update({
                where: { id: 1 },
                data: { amount: { decrement: amount } }
            });


            return newCompanyPurchase
        });
        return companyPurchase;
    })
}

export async function updateCompanyPurchase(dataCompanyPurchase: UpdateCompanyPurchase) {
    return tryCatch(async () => {
        const data = updateCompanyPurchaseSchema.parse(dataCompanyPurchase);

        const companyPurchase = await prisma.$transaction(async (tx) => {
            const oldCompanyPurchase = await tx.companyPurchase.findFirst({
                where: { id: data.id, company: { deleted_at: null } }
            });

            if (!oldCompanyPurchase) throw new Error('وەصڵەکە نەدۆزرایەوە');
            if (oldCompanyPurchase.type !== data.type) throw new Error('جۆری پارەدان ناگۆڕدرێت بەردەوامبە لەسەر شێوازی پێشوو');
            const isCompleted = oldCompanyPurchase.totalAmount === oldCompanyPurchase.totalRemaining;

            if (!isCompleted) {
                const { id, ...rest } = data;
                const updatedCompanyPurchase = await tx.companyPurchase.update({ where: { id }, data: rest });
                if (data.type === "LOAN" && oldCompanyPurchase.totalRemaining !== data.totalRemaining) {
                    await tx.boxes.update({
                        where: { id: 1 },
                        data: { amount: { increment: oldCompanyPurchase.totalRemaining } }
                    })
                    await tx.boxes.update({
                        where: { id: 1 },
                        data: { amount: { decrement: data.totalRemaining } }
                    })
                }
                return updatedCompanyPurchase;
            } else {
                throw new Error('وەسڵی تەواو بوو دەسکاری ناکرێت');
            }
        })
        return companyPurchase;
    })
}

export async function deleteCompanyPurchase(id: number, companyId: number) {
    return tryCatch(async () => {
        const data = deleteCompanyPurchaseSchema.parse({ id, companyId });
        const companyPurchase = await prisma.$transaction(async (tx) => {

            const oldCompanyPurchase = await tx.companyPurchase.findFirst({
                where: {
                    id: data.id,
                    companyId: data.companyId,
                    company: { deleted_at: null }
                }
            });
            if (!oldCompanyPurchase) throw new Error('وەسڵ نەدۆزرایەوە');

            await tx.companyPurchase.update({
                where: { id: data.id },
                data: { deleted_at: new Date() }
            })

            return oldCompanyPurchase;
        })
        return companyPurchase;
    })
}

export async function restoreCompanyPurchase(id: number, companyId: number) {
    return tryCatch(async () => {
        const data = deleteCompanyPurchaseSchema.parse({ id, companyId });
        const companyPurchase = await prisma.$transaction(async (tx) => {
            const oldCompanyPurchase = await tx.companyPurchase.findUnique({
                where: { id: data.id, company: { deleted_at: null } }
            });
            if (!oldCompanyPurchase) throw new Error('وەسڵ نەدۆزرایەوە');

            await tx.companyPurchase.update({
                where: { id: data.id },
                data: { deleted_at: null }
            })

            return oldCompanyPurchase;
        })
        return companyPurchase;
    })
}

export async function forceDeleteCompanyPurchase(id: number, companyId: number) {
    return tryCatch(async () => {
        const data = deleteCompanyPurchaseSchema.parse({ id, companyId });
        const companyPurchase = await prisma.companyPurchase.delete({
            where: {
                id: data.id,
                companyId: data.companyId,
                company: { deleted_at: null },
                deleted_at: { not: null }
            }
        });
        return companyPurchase;
    })
}


// COMPANY PURCHASE INFO ACCESS LAYER

export async function getOneCompanyPurchaseInfo(id: number, companyPurchaseId: number) {
    return tryCatch(async () => {
        const data = getOneCompanyPurchaseInfoSchema.parse({ id, companyPurchaseId });
        const companyPurchaseInfo = await prisma.purchasesInfo.findUniqueOrThrow({
            where: {
                id: data.id,
                companyPurchaseId: data.companyPurchaseId,
                companyPurchase: {
                    deleted_at: null,
                    company: { deleted_at: null }
                }
            }
        });
        return companyPurchaseInfo;
    })
}

export async function getListCompanyPurchaseInfo(companyPurchaseId: number) {
    return tryCatch(async () => {
        const data = getListCompanyPurchaseInfoSchema.parse({ companyPurchaseId });
        const purchase = await prisma.companyPurchase.findFirst({
            where: { id: data.companyPurchaseId, company: { deleted_at: null } }
        });
        if (!purchase) throw new Error('وەسڵی پارەدان نەدۆزرایەوە');

        const companyPurchaseInfo = await prisma.purchasesInfo.findMany({
            where: {
                companyPurchaseId: purchase.id,
                companyPurchase: {
                    deleted_at: null,
                    company: { deleted_at: null }
                }
            },
        });
        return { purchaseInfo: companyPurchaseInfo, purchase };
    })
}

export async function createCompanyPurchaseInfo(dataCompanyPurchaseInfo: CreateCompanyPurchaseInfo) {
    return tryCatch(async () => {
        const data = createCompanyPurchaseInfoSchema.parse(dataCompanyPurchaseInfo);
        const companyPurchaseInfo = await prisma.$transaction(async (tx) => {
            const companyPurchase = await tx.companyPurchase.findFirstOrThrow({
                where: { id: data.companyPurchaseId, company: { deleted_at: null } }
            });
            if (!companyPurchase) throw new Error('وەسڵی پارەدان نەدۆزرایەوە');
            if (companyPurchase.totalRemaining + data.amount > companyPurchase.totalAmount) {
                throw new Error('بڕی پێویست داخڵ بکە نەک زیاتر لە کۆی گشتی');
            }

            const purchaseInfo = await tx.purchasesInfo.create({ data });
            await tx.companyPurchase.update({
                where: { id: data.companyPurchaseId },
                data: { totalRemaining: { increment: data.amount } }
            });
            await tx.boxes.update({
                where: { id: 1 },
                data: { amount: { decrement: data.amount } }
            })
            return purchaseInfo;
        })
        return companyPurchaseInfo;
    })
}

export async function deleteCompanyPurchaseInfo(id: number, companyPurchaseId: number) {
    return tryCatch(async () => {
        const data = deleteCompanyPurchaseInfoSchema.parse({ id, companyPurchaseId });
        const companyPurchaseInfo = await prisma.purchasesInfo.delete({
            where: {
                id: data.id,
                companyPurchaseId: data.companyPurchaseId,
                companyPurchase: {
                    deleted_at: null,
                    company: { deleted_at: null }
                }
            },
            select: {
                amount: true
            }
        });
        await prisma.companyPurchase.update({
            where: { id: data.companyPurchaseId },
            data: { totalRemaining: { decrement: companyPurchaseInfo.amount } }
        })
        await prisma.boxes.update({
            where: { id: 1 },
            data: { amount: { increment: companyPurchaseInfo.amount } }
        })
        return companyPurchaseInfo;
    })
}

