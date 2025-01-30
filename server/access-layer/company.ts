import 'server-only';

import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import {
  CreateCompany,
  CreateCompanyPurchase,
  CreateCompanyPurchaseInfo,
  createCompanyPurchaseInfoSchema,
  createCompanyPurchaseSchema,
  createCompanySchema,
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
  updateCompanySchema,
} from '../schema/company';

// COMPANY ACCESS LAYER

export async function getOneCompany(id: number) {
  return tryCatch(async () => {
    const data = getOneCompanySchema.parse({ id });
    const company = await prisma.companies.findFirst({
      where: { id: data.id, deleted_at: null },
    });
    return company;
  });
}

export async function getCompanyBySlug(slug: string) {
  return tryCatch(async () => {
    const data = getOneCompanyByNameSchema.parse({ name: slug });
    const company = await prisma.companies.findFirst({
      where: { name: data.name, deleted_at: null },
    });
    return company;
  });
}

export async function getCompaniesList(trashed: boolean = false) {
  return tryCatch(async () => {
    const companies = await prisma.companies.findMany({
      where: { deleted_at: trashed ? { not: null } : null },
      orderBy: {
        created_at: 'desc',
      },
    });
    return companies;
  });
}

export async function createCompany(dataCompany: CreateCompany) {
  return tryCatch(async () => {
    const data = createCompanySchema.parse(dataCompany);
    const company = await prisma.companies.create({
      data,
    });
    return company;
  });
}

export async function updateCompany(dataCompany: UpdateCompany) {
  return tryCatch(async () => {
    const data = updateCompanySchema.parse(dataCompany);
    const { id, ...rest } = data;
    const company = await prisma.companies.update({
      where: { id, deleted_at: null },
      data: rest,
    });
    return company;
  });
}

export async function deleteCompany(id: number) {
  return tryCatch(async () => {
    const data = deleteCompanySchema.parse({ id });
    const company = await prisma.companies.update({
      where: { id: data.id, deleted_at: null },
      data: { deleted_at: new Date() },
    });
    return company;
  });
}

export async function restoreCompany(id: number) {
  return tryCatch(async () => {
    const data = deleteCompanySchema.parse({ id });
    const company = await prisma.companies.update({
      where: { id: data.id, deleted_at: { not: null } },
      data: { deleted_at: null },
    });
    return company;
  });
}

export async function forceDeleteCompany(id: number) {
  return tryCatch(async () => {
    const data = deleteCompanySchema.parse({ id });
    const company = await prisma.companies.delete({
      where: { id: data.id, deleted_at: { not: null } },
    });
    return company;
  });
}

// COMPANY PURCHASE ACCESS LAYER

export async function getCompanyOnePurchase(companyId: number) {
  return tryCatch(async () => {
    const companyPurchase = await prisma.companyPurchase
      .findFirst({
        where: {
          id: companyId,
          deleted_at: null,
          company: { deleted_at: null },
        },
        include: { company: true },
        orderBy: {
          created_at: 'desc',
        },
      })
      .catch((e) => {
        throw new Error(e);
      });
    return companyPurchase;
  });
}

export async function getCompanyListPurchase(id: number, trashed: boolean) {
  return tryCatch(async () => {
    // Fetch the company details separately
    const company = await prisma.companies.findUnique({
      where: { id },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Fetch the company purchases
    const companyPurchases = await prisma.companyPurchase.findMany({
      where: {
        companyId: id,
        deleted_at: trashed ? { not: null } : null,
        company: { deleted_at: null },
      },
      include: { company: true },
      orderBy: {
        created_at: 'desc',
      },
    });

    // If no purchases are found, return the company name with an empty purchases array
    if (companyPurchases.length === 0) {
      return {
        company: company,
        purchases: [],
      };
    }

    // Return the purchases along with the company name
    return {
      company: company,
      purchases: companyPurchases,
    };
  });
}

export async function createCompanyPurchase(
  dataCompanyPurchase: CreateCompanyPurchase
) {
  return tryCatch(async () => {
    const data = createCompanyPurchaseSchema.parse(dataCompanyPurchase);

    const companyPurchase = await prisma.$transaction(async (tx) => {
      const company = await tx.companies.findFirst({
        where: { id: data.companyId!, deleted_at: null },
      });
      if (!company) throw new Error('کۆمپانیا نەدۆزرایەوە');

      if (data.type === 'CASH') {
        (data as any).totalRemaining = (data as any).totalAmount;
      }
      const newCompanyPurchase = await tx.companyPurchase.create({ data });

      return newCompanyPurchase;
    });
    return companyPurchase;
  });
}

export async function updateCompanyPurchase(
  dataCompanyPurchase: UpdateCompanyPurchase
) {
  return tryCatch(async () => {
    const data = updateCompanyPurchaseSchema.parse(dataCompanyPurchase);

    const companyPurchase = await prisma.$transaction(async (tx) => {
      const oldCompanyPurchase = await tx.companyPurchase.findFirst({
        where: { id: data.id, deleted_at: null },
      });

      if (!oldCompanyPurchase) throw new Error('وەصڵەکە نەدۆزرایەوە');
      if (oldCompanyPurchase.type !== data.type)
        throw new Error('جۆری پارەدان ناگۆڕدرێت بەردەوامبە لەسەر شێوازی پێشوو');

      const { id, ...rest } = data;
      const updatedCompanyPurchase = await tx.companyPurchase.update({
        where: { id },
        data: {
          ...rest,
          //if type is cash then total remaining is total amount
          totalRemaining:
            data.type === 'CASH'
              ? data.totalAmount
              : oldCompanyPurchase.totalRemaining,
        },
      });
      return updatedCompanyPurchase;
    });
    return companyPurchase;
  });
}

export async function deleteCompanyPurchase(id: number) {
  return tryCatch(async () => {
    const data = deleteCompanyPurchaseSchema.parse({ id });
    const companyPurchase = await prisma.$transaction(async (tx) => {
      const oldCompanyPurchase = await tx.companyPurchase.findFirst({
        where: {
          id: data.id,
          deleted_at: null,
        },
      });
      if (!oldCompanyPurchase) throw new Error('وەسڵ نەدۆزرایەوە');

      await tx.companyPurchase.update({
        where: { id: data.id },
        data: { deleted_at: new Date() },
      });

      return oldCompanyPurchase;
    });
    return companyPurchase;
  });
}

export async function restoreCompanyPurchase(id: number) {
  return tryCatch(async () => {
    const data = deleteCompanyPurchaseSchema.parse({ id });
    const companyPurchase = await prisma.$transaction(async (tx) => {
      const oldCompanyPurchase = await tx.companyPurchase.findUnique({
        where: { id: data.id, deleted_at: { not: null } },
      });
      if (!oldCompanyPurchase) throw new Error('وەسڵ نەدۆزرایەوە');

      await tx.companyPurchase.update({
        where: { id: data.id },
        data: { deleted_at: null },
      });

      return oldCompanyPurchase;
    });
    return companyPurchase;
  });
}

export async function forceDeleteCompanyPurchase(id: number) {
  return tryCatch(async () => {
    const data = deleteCompanyPurchaseSchema.parse({ id });
    const companyPurchase = await prisma.companyPurchase.delete({
      where: {
        id: data.id,
        deleted_at: { not: null },
      },
    });
    return companyPurchase;
  });
}

// COMPANY PURCHASE INFO ACCESS LAYER

export async function getOneCompanyPurchaseInfo(
  id: number,
  companyPurchaseId: number
) {
  return tryCatch(async () => {
    const data = getOneCompanyPurchaseInfoSchema.parse({
      id,
      companyPurchaseId,
    });
    const companyPurchaseInfo = await prisma.purchasesInfo.findFirst({
      where: {
        id: data.id,
        companyPurchaseId: data.companyPurchaseId,
        companyPurchase: { deleted_at: null },
      },
    });
    return companyPurchaseInfo;
  });
}

export async function getListCompanyPurchaseInfo(companyPurchaseId: number) {
  return tryCatch(async () => {
    const data = getListCompanyPurchaseInfoSchema.parse({ companyPurchaseId });
    const purchase = await prisma.companyPurchase.findFirst({
      where: { id: data.companyPurchaseId, deleted_at: null },
    });
    if (!purchase) throw new Error('وەسڵ نەدۆزرایەوە');

    const companyPurchaseInfo = await prisma.purchasesInfo.findMany({
      where: {
        companyPurchaseId: purchase.id,
        companyPurchase: { deleted_at: null },
      },
    });
    return { purchaseInfo: companyPurchaseInfo, purchase };
  });
}

export async function createCompanyPurchaseInfo(
  dataCompanyPurchaseInfo: CreateCompanyPurchaseInfo
) {
  return tryCatch(async () => {
    const data = createCompanyPurchaseInfoSchema.parse(dataCompanyPurchaseInfo);
    const companyPurchaseInfo = await prisma.$transaction(async (tx) => {
      const companyPurchase = await tx.companyPurchase.findFirstOrThrow({
        where: { id: data.companyPurchaseId, deleted_at: null },
      });
      if (!companyPurchase) throw new Error('وەسڵی پارەدان نەدۆزرایەوە');
      if (
        companyPurchase.totalRemaining + data.amount >
        companyPurchase.totalAmount
      ) {
        throw new Error('بڕی پێویست داخڵ بکە نەک زیاتر لە کۆی گشتی');
      }

      await tx.companyPurchase.update({
        where: { id: data.companyPurchaseId, type: 'LOAN', deleted_at: null },
        data: { totalRemaining: { increment: data.amount } },
      });
      const purchaseInfo = await tx.purchasesInfo.create({ data });
      return purchaseInfo;
    });
    return companyPurchaseInfo;
  });
}

export async function deleteCompanyPurchaseInfo(
  id: number,
  companyPurchaseId: number
) {
  return tryCatch(async () => {
    const data = deleteCompanyPurchaseInfoSchema.parse({
      id,
      companyPurchaseId,
    });
    const companyPurchaseInfo = await prisma.purchasesInfo.delete({
      where: {
        id: data.id,
        companyPurchaseId: data.companyPurchaseId,
        companyPurchase: {
          deleted_at: null,
        },
      },
      select: {
        amount: true,
      },
    });
    await prisma.companyPurchase.update({
      where: { id: data.companyPurchaseId },
      data: { totalRemaining: { decrement: companyPurchaseInfo.amount } },
    });
    return companyPurchaseInfo;
  });
}
