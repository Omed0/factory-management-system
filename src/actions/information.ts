'use server';

import { report_name } from '@/app/(root)/report/_constant';
import {
  getCustomersWhoDidntGiveLoan,
  getDashboardChartInformation,
  getDashboardInformation,
  getExpensesListSpecificTime,
  getLoanSummary,
  getPurchasesListSpecificTime,
  getReportPartnerFromChart,
  getSalesListSpecificTime,
  getTradePartnerFromType,
} from '@/server/access-layer/information';
import {
  DashboardInfoTypes,
  getReportChartPartnerTypes,
  ReportDateTypes,
  ReportTradePartnerTypes,
  TradePartnerTypes,
} from '@/server/schema/information';

const reportes = [
  { name: report_name[0], action: getExpensesListSpecificTime },
  { name: report_name[1], action: getSalesListSpecificTime },
  { name: report_name[2], action: getPurchasesListSpecificTime },
];

export async function getReportByNameActions(data: ReportDateTypes) {
  const res = await reportes
    .find((report) => report.name === data.name)
    ?.action(data);
  if (!res || 'error' in res) {
    return {
      success: false,
      message: res?.error ?? 'هەڵەیەک هەیە',
    };
  }
  return { success: true, data: res };
}

export async function getTradePartnerActions(data: TradePartnerTypes) {
  const res = await getTradePartnerFromType(data);
  if (!res || 'error' in res) {
    return {
      success: false,
      message: res?.error ?? 'هەڵەیەک هەیە',
    };
  }
  return { success: true, data: res };
}

export async function getReportPartnerChartActions(
  data: getReportChartPartnerTypes
) {
  const res = await getReportPartnerFromChart(data);
  if (!res || 'error' in res) {
    return {
      success: false,
      message: res?.error ?? 'هەڵەیەک هەیە',
    };
  }
  return { success: true, data: res };
}

export async function getReportPartnerSpecificTimeActions(
  data: ReportTradePartnerTypes
) {
  const res = await getLoanSummary(data);
  if (!res || 'error' in res) {
    return {
      success: false,
      message: res?.error ?? 'هەڵەیەک هەیە',
    };
  }
  return { success: true, data: res };
}

export async function getDashboardInfoActions(data: DashboardInfoTypes) {
  const res = await getDashboardInformation(data);
  if (!res || 'error' in res) {
    return {
      success: false,
      message: res?.error ?? 'هەڵەیەک هەیە',
    };
  }
  return { success: true, data: res ?? {} };
}

export async function getDashboardInfoChartActions() {
  const res = await getDashboardChartInformation();
  if (!res || 'error' in res) {
    return {
      success: false,
      message: res?.error ?? 'هەڵەیەک هەیە',
    };
  }
  return { success: true, data: res ?? {} };
}

export async function getCustomersWhoDidntGiveLoanActions() {
  const res = await getCustomersWhoDidntGiveLoan();
  if (!res || 'error' in res) {
    return {
      success: false,
      message: res?.error ?? 'هەڵەیەک هەیە',
    };
  }
  return { success: true, data: res };
}
