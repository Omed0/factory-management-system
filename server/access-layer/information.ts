import 'server-only';

import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import {
  DashboardInfoTypes, getDashboardInfoSchema, getReportByDateSchema,
  getReportProductByDateSchema, getTradePartnerSchema,
  ReportDateTypes, ReportProductTypes, TradePartner,
  TradePartnerTypes
} from '../schema/information';
import { keyExpense, keyPurchase, keySale } from '@/app/(root)/report/_constant';
import { Prisma } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';



export async function getDashboardInforamtion(data: DashboardInfoTypes) {
  return tryCatch(async () => {
    const formated = getDashboardInfoSchema.parse(data);

    // Count total remaining sales and subtract discounts
    const totalSalesData = await prisma.sales.aggregate({
      _sum: {
        totalRemaining: true,
        discount: true,
      },
      where: {
        saleDate: { gte: formated.from, lte: formated.to },
        deleted_at: null,
      },
    });
    const totalRemainingAfterDiscount = (totalSalesData._sum.totalRemaining || 0) - (totalSalesData._sum.discount || 0);

    // Count customers created within the date range
    const totalCustomers = await prisma.customers.count({
      where: {
        created_at: { gte: formated.from, lte: formated.to },
        deleted_at: null,
      },
    });

    // Count sales within the date range
    const totalSalesCount = await prisma.sales.count({
      where: {
        saleDate: { gte: formated.from, lte: formated.to },
        deleted_at: null,
      },
    });

    // Count active loan customers
    const activeLoanCustomersCount = await prisma.customers.count({
      where: {
        sales: { every: { saleType: "LOAN" } },
        created_at: { gte: formated.from, lte: formated.to },
        deleted_at: null,
      },
    });

    // Retrieve 5 latest sales with customer details
    const latestSales = await prisma.sales.findMany({
      where: {
        deleted_at: null,
      },
      include: {
        customer: true, // Assuming there's a relation to customer
      },
      orderBy: {
        saleDate: 'desc',
      },
      take: 5,
    });

    // Count sales created within the date range
    const salesCreatedCount = await prisma.sales.count({
      where: {
        created_at: { gte: formated.from, lte: formated.to },
        deleted_at: null,
      },
    });

    return {
      totalRemainingAfterDiscount,
      totalCustomers,
      totalSalesCount,
      activeLoanCustomersCount,
      latestSales,
      salesCreatedCount,
    };
  });
}

export async function getDashboardChartInformation() {
  return tryCatch(async () => {
    const currentDate = new Date();
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      return {
        month: date.getMonth() + 1, // Month is 0-indexed
        year: date.getFullYear(),
      };
    }).reverse();

    const chartData = await Promise.all(last12Months.map(async ({ month, year }) => {
      const totalSalesData = await prisma.sales.aggregate({
        _sum: {
          totalRemaining: true,
          discount: true,
        },
        where: {
          saleDate: {
            gte: new Date(year, month - 1, 1), // Start of the month
            lt: new Date(year, month, 1), // Start of the next month
          },
          deleted_at: null,
        },
      });
      const totalRemainingAfterDiscount = (totalSalesData._sum.totalRemaining || 0) - (totalSalesData._sum.discount || 0);
      return {
        month,
        year,
        totalRemainingAfterDiscount,
      };
    }));

    return chartData;
  });
}

export async function getCustomersWhoDidntGiveLoan() {
  return tryCatch(async () => {
    const now = new Date();
    const oneMonthAgo = addMonths(now, -1);
    const twoMonthAgo = addMonths(now, -2);

    // Helper function for query
    const getCustomersByDateRange = async (
      startDate: Date,
      endDate?: Date
    ) => {
      const customers = await prisma.customers.findMany({
        where: {
          sales: {
            some: {
              paidLoans: {
                some: {
                  paidDate: endDate
                    ? { gt: startDate, lt: endDate }
                    : { lt: startDate },
                },
              },
              saleType: "LOAN",
              deleted_at: null,
              isFinished: false,
            },
          },
        },
        include: {
          sales: { include: { paidLoans: true } },
        },
      });

      // Filter customers based on totalRemaining condition
      const filteredCustomers = customers.filter((customer) =>
        customer.sales.some(
          (sale) =>
            sale.totalRemaining !== sale.totalAmount - sale.discount
        )
      );

      return filteredCustomers;
    };

    // Query 2: Customers who did not pay last month but paid before that
    const oneMonthAgoCustomers = await getCustomersByDateRange(
      twoMonthAgo, oneMonthAgo
    );

    // Query 3: Customers who did not pay for more than one month
    const twoMonthsAgoCustomers = await getCustomersByDateRange(twoMonthAgo);
    console.log(new Date("2024-10-06T12:02:30.647Z") > twoMonthAgo)

    return {
      oneMonthAgoCustomers,
      twoMonthsAgoCustomers,
    };
  });
}


export async function getExpensesListSpecificTime(
  data: ReportDateTypes
) {
  return tryCatch(async () => {
    const formated = getReportByDateSchema.parse(data);

    const expenses = await prisma.expenses.findMany({
      where: {
        created_at: { gte: formated.from, lte: formated.to },
        deleted_at: null,
      },
    });
    // Calculate total expenses
    const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0); // Assuming 'amount' is the field for expense value

    const totalExpenseObject = {
      id: 0,
      title: 'کۆی گشتی',
      note: null,
      amount: totalExpense,
      created_at: new Date(),
    };

    expenses.unshift(totalExpenseObject as any);

    return selectAndRenameKeysFromArray(expenses, keyExpense);
  });
}

export async function getSalesListSpecificTime(
  data: ReportDateTypes
) {
  return tryCatch(async () => {
    const formated = getReportByDateSchema.parse(data);

    const sales = await prisma.sales.findMany({
      where: {
        saleDate: { gte: formated.from, lte: formated.to },
        deleted_at: null,
        isFinished: true,
      },
    });
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalRemaining, 0);
    const totalSaleObject = {
      id: 0,
      saleNumber: 'کۆی گشتی',
      note: null,
      totalRemaining: totalSales,
      saleDate: new Date(),
    };

    sales.unshift(totalSaleObject as any)
    return selectAndRenameKeysFromArray(sales, keySale);
  });
}

export async function getPurchasesListSpecificTime(
  data: ReportDateTypes
) {
  return tryCatch(async () => {
    const formated = getReportByDateSchema.parse(data);

    const purchases = await prisma.companyPurchase.findMany({
      where: {
        purchaseDate: { gte: formated.from, lte: formated.to },
        deleted_at: null,
      },
    });

    const totalPurchase = purchases.reduce((sum, sale) => sum + sale.totalRemaining, 0);
    const totalPurchaseObject = {
      id: 0,
      name: 'کۆی گشتی',
      note: null,
      totalRemaining: totalPurchase,
      purchaseDate: new Date(),
    };
    purchases.unshift(totalPurchaseObject as any)

    return selectAndRenameKeysFromArray(purchases, keyPurchase);
  });
}


export async function getCountProductListSpecificTime(
  data: ReportProductTypes
) {
  return tryCatch(async () => {
    const formated = getReportProductByDateSchema.parse(data);

    const products = await prisma.saleItems.findMany({
      where: {

      },
    });


    return selectAndRenameKeysFromArray(products, keyPurchase);
  });
}


export async function getTradePartnerFromType(data: TradePartnerTypes) {
  return tryCatch(async () => {
    let table = Prisma.sql`customers`;
    const formated = getTradePartnerSchema.parse(data);
    if (formated.type === "company") {
      table = Prisma.sql`companies`;
    }

    const tradePartner = await prisma.$queryRaw<TradePartner[]>`
    SELECT * FROM ${table} WHERE name LIKE ${`%${formated.name}%`} AND deleted_at IS NULL
  `;

    return tradePartner;
  });
}

export function selectAndRenameKeysFromArray<T extends object>(
  array: T[],
  keyMap: { [K in keyof T]?: string }
): Partial<Record<string, any>>[] {
  return array.map(item => {
    const selected: Partial<Record<string, any>> = {};
    for (const key in keyMap) {
      if (key in item) {
        selected[keyMap[key] as string] = item[key];
      }
    }
    return selected;
  }) as Array<Pick<T, keyof typeof keyMap>>;
}

