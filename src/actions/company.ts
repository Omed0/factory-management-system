'use server';

import { revalidatePath } from 'next/cache';

import {
  createCompany,
  createCompanyPurchase,
  createCompanyPurchaseInfo,
  deleteCompany,
  deleteCompanyPurchase,
  deleteCompanyPurchaseInfo,
  forceDeleteCompany,
  forceDeleteCompanyPurchase,
  getCompaniesList,
  getCompanyBySlug,
  getCompanyListPurchase,
  getCompanyOnePurchase,
  getListCompanyPurchaseInfo,
  getOneCompany,
  getOneCompanyPurchaseInfo,
  restoreCompany,
  restoreCompanyPurchase,
  updateCompany,
  updateCompanyPurchase,
} from '@/server/access-layer/company';
import {
  CreateCompanyPurchase,
  CreateCompanyPurchaseInfo,
  UpdateCompany,
  UpdateCompanyPurchase,
} from '@/server/schema/company';
import { CreateCompany } from '@/server/schema/company';

// COMPANY ACTIONS

export async function getOneCompanyActions(id: number) {
  const company = await getOneCompany(id);
  if (company === null || 'error' in company) {
    return {
      success: false,
      message: company?.error ?? 'کۆمپانیا نەدۆزرایەوە',
    };
  }
  return { success: true, data: company };
}

export async function getCompanyBySlugActions(slug: string) {
  const company = await getCompanyBySlug(slug);
  if (company === null || 'error' in company) {
    return {
      success: false,
      message: company?.error ?? 'کۆمپانیا نەدۆزرایەوە',
    };
  }
  return { success: true, data: company };
}

export async function getCompanyListActions(trashed: boolean = false) {
  const companies = await getCompaniesList(trashed);
  if (companies === null || 'error' in companies) {
    return {
      success: false,
      message: companies?.error,
    };
  }
  return { success: true, data: companies };
}

export async function createCompanyActions(data: CreateCompany) {
  const company = await createCompany(data);
  if (company === null || 'error' in company) {
    return {
      success: false,
      message: company?.error,
    };
  }
  revalidatePath('/company');
  return { success: true, message: 'کۆمپانیا دروستکرا' };
}

export async function updateCompanyActions(data: UpdateCompany) {
  const company = await updateCompany(data);
  if (company === null || 'error' in company) {
    return {
      success: false,
      message: company?.error,
    };
  }
  revalidatePath('/company');
  return { success: true, message: 'گۆڕانکاری سەرکەوتبوو' };
}

export async function deleteCompanyActions(id: number) {
  const company = await deleteCompany(id);
  if (company === null || 'error' in company) {
    return {
      success: false,
      message: company?.error,
    };
  }
  revalidatePath('/company');
  return { success: true, message: 'کۆمپانیا ئەرشیفکرا' };
}

export async function restoreCompanyActions(id: number) {
  const company = await restoreCompany(id);
  if (company === null || 'error' in company) {
    return {
      success: false,
      message: company?.error,
    };
  }
  revalidatePath('/company');
  return { success: true, message: 'کۆمپانیا گەڕێندرایەوە' };
}

export async function forceDeleteCompanyActions(id: number) {
  const company = await forceDeleteCompany(id);
  if (company === null || 'error' in company) {
    return {
      success: false,
      message: company?.error,
    };
  }
  revalidatePath('/company');
  return { success: true, message: 'کۆمپانیا بەتەواوی سڕایەوە' };
}

// COMPANY PURCHASE ACTIONS

export async function getCompanyOnePurchaseActions(id: number) {
  const companyPurchase = await getCompanyOnePurchase(id);
  if (companyPurchase === null || 'error' in companyPurchase) {
    return {
      success: false,
      message: companyPurchase?.error,
    };
  }
  return { success: true, data: companyPurchase };
}

export async function getCompanyListPurchaseActions(
  id: number,
  trashed: boolean = false
) {
  const companyPurchase = await getCompanyListPurchase(id, trashed);
  if (companyPurchase === null || 'error' in companyPurchase) {
    return {
      success: false,
      message: companyPurchase?.error,
    };
  }
  return { success: true, data: companyPurchase };
}

export async function createCompanyPurchaseActions(
  data: CreateCompanyPurchase
) {
  const companyPurchase = await createCompanyPurchase(data);
  if (companyPurchase === null || 'error' in companyPurchase) {
    return {
      success: false,
      message: companyPurchase?.error,
    };
  }
  revalidatePath(`/company/${data.companyId}`);
  return { success: true, message: 'بەسەرکەوتووی دروستکرا' };
}

export async function updateCompanyPurchaseActions(
  data: UpdateCompanyPurchase
) {
  const companyPurchase = await updateCompanyPurchase(data);
  if (companyPurchase === null || 'error' in companyPurchase) {
    return {
      success: false,
      message: companyPurchase?.error,
    };
  }
  revalidatePath(`/company/${data.companyId}`);
  return { success: true, message: 'گۆڕانکاری سەرکەوتبوو' };
}

export async function deleteCompanyPurchaseActions(
  id: number,
  companyId: number
) {
  const companyPurchase = await deleteCompanyPurchase(id, companyId);
  if (companyPurchase === null || 'error' in companyPurchase) {
    return {
      success: false,
      message: companyPurchase?.error,
    };
  }
  revalidatePath(`/company/${companyId}`);
  return { success: true, message: 'بەسەرکەوتووی سڕایەوە' };
}

export async function restoreCompanyPurchaseActions(
  id: number,
  companyId: number
) {
  const companyPurchase = await restoreCompanyPurchase(id, companyId);
  if (companyPurchase === null || 'error' in companyPurchase) {
    return {
      success: false,
      message: companyPurchase?.error,
    };
  }
  revalidatePath(`/company/${companyId}`);
  return { success: true, message: 'بەسەرکەوتووی گەڕایەوە' };
}

export async function forceDeleteCompanyPurchaseActions(
  id: number,
  companyId: number
) {
  const companyPurchase = await forceDeleteCompanyPurchase(id, companyId);
  if (companyPurchase === null || 'error' in companyPurchase) {
    return {
      success: false,
      message: companyPurchase?.error,
    };
  }
  revalidatePath(`/company/${companyId}`);
  return { success: true, message: 'بەسەرکەوتووی بەتەواوی سڕایەوە' };
}

// COMPANY PURCHASE INFO ACTIONS

export async function getOneCompanyPurchaseInfoActions(
  id: number,
  companyPurchaseId: number
) {
  const companyPurchaseInfo = await getOneCompanyPurchaseInfo(
    id,
    companyPurchaseId
  );
  if (companyPurchaseInfo === null || 'error' in companyPurchaseInfo) {
    return {
      success: false,
      message: companyPurchaseInfo?.error,
    };
  }
  return { success: true, data: companyPurchaseInfo };
}

export async function getListCompanyPurchaseInfoActions(
  companyPurchaseId: number
) {
  const companyPurchaseInfo =
    await getListCompanyPurchaseInfo(companyPurchaseId);
  if (companyPurchaseInfo === null || 'error' in companyPurchaseInfo) {
    return {
      success: false,
      message: companyPurchaseInfo?.error,
    };
  }
  return { success: true, data: companyPurchaseInfo };
}

export async function createCompanyPurchaseInfoActions(
  data: CreateCompanyPurchaseInfo
) {
  const companyPurchaseInfo = await createCompanyPurchaseInfo(data);
  if (companyPurchaseInfo === null || 'error' in companyPurchaseInfo) {
    return {
      success: false,
      message: companyPurchaseInfo?.error,
    };
  }
  revalidatePath(`/company/${data.companyPurchaseId}`);
  return { success: true, message: 'دروستکراو' };
}

export async function deleteCompanyPurchaseInfoActions(
  id: number,
  companyPurchaseId: number
) {
  const companyPurchaseInfo = await deleteCompanyPurchaseInfo(
    id,
    companyPurchaseId
  );
  if (companyPurchaseInfo === null || 'error' in companyPurchaseInfo) {
    return {
      success: false,
      message: companyPurchaseInfo?.error,
    };
  }
  revalidatePath(`/company/${companyPurchaseId}`);
  return { success: true, message: 'بەتەواوی سڕایەوە' };
}
