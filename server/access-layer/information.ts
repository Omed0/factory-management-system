import 'server-only';

import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import {
  DashboardInfoTypes,
  getDashboardInfoSchema,
  getReportByDateSchema,
  getReportChartPartnerSchema,
  getReportChartPartnerTypes,
  getReportTradePartnerSchema,
  getTradePartnerSchema,
  ReportDateTypes,
  ReportTradePartnerTypes,
  TradePartner,
  TradePartnerTypes,
} from '../schema/information';
import {
  keyExpense,
  keyPurchase,
  keySale,
} from '@/app/(root)/report/_constant';
import { Prisma } from '@prisma/client';
import { addMonths } from 'date-fns';
import { calculateTotalAmount } from './box';

type LoanSummary = {
  _sum: {
    totalRemaining: number | null;
    totalAmount: number | null;
    discount?: number | null;
  };
};

type PartnerChartSummary = {
  _sum: {
    totalRemaining: number | null;
  };
};

export async function getDashboardInformation(data: DashboardInfoTypes) {
  return tryCatch(async () => {
    const formated = getDashboardInfoSchema.parse(data);

    const [totalPurchasesData, customers, salesData, totalMoneyInBox] =
      await Promise.all([
        prisma.companyPurchase.aggregate({
          _sum: {
            totalRemaining: true,
          },
          where: {
            purchaseDate: { gte: formated.from, lte: formated.to },
            deleted_at: null,
          },
        }),
        prisma.customers.findMany({
          where: {
            created_at: { gte: formated.from, lte: formated.to },
            deleted_at: null,
          },
          include: { sales: true },
        }),
        prisma.sales.findMany({
          where: {
            saleDate: { gte: formated.from, lte: formated.to },
            deleted_at: null,
            isFinished: true,
          },
          include: {
            customer: true,
          },
        }),
        calculateTotalAmount(),
      ]);

    const latestSales = salesData.slice(-5).reverse();
    const totalSalesCount = salesData.length;
    const totalCustomers = customers.length;
    const totalSalesAmount = salesData.reduce(
      (sum, sale) => sum + sale.totalRemaining,
      0
    );
    const activeLoanCustomersCount = customers.filter((customer) =>
      customer.sales.some(
        (sale) =>
          sale.saleType === 'LOAN' &&
          sale.totalAmount - sale.discount !== sale.totalRemaining
      )
    ).length;

    if (typeof totalMoneyInBox === 'object' && 'error' in totalMoneyInBox) {
      throw totalMoneyInBox;
    }

    return {
      totalIncome: totalSalesAmount || 0,
      totalOutgoing: totalPurchasesData._sum.totalRemaining || 0,
      totalCustomers,
      totalSalesCount,
      activeLoanCustomersCount,
      latestSales,
      totalMoneyInBox,
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

    const chartData = await Promise.all(
      last12Months.map(async ({ month, year }) => {
        const totalSalesData = await prisma.sales.aggregate({
          _sum: {
            totalRemaining: true,
          },
          where: {
            saleDate: {
              gte: new Date(year, month - 1, 1), // Start of the month
              lt: new Date(year, month, 1), // Start of the next month
            },
            deleted_at: null,
            isFinished: true,
          },
        });
        const all_employee_actions = await prisma.employeeActions.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            created_at: {
              gte: new Date(year, month - 1, 1), // Start of the month
              lt: new Date(year, month, 1), // Start of the next month
            },
            type: { in: ['PUNISHMENT', 'ABSENT'] },
          },
        });
        const totalIncome =
          totalSalesData._sum.totalRemaining ||
          0 + (all_employee_actions._sum.amount ?? 0);

        return {
          month,
          year,
          totalIncome,
        };
      })
    );

    return chartData;
  });
}

export async function getCustomersWhoDidntGiveLoan() {
  return tryCatch(async () => {
    const now = new Date();
    const oneMonthAgo = addMonths(now, -1);
    const twoMonthAgo = addMonths(now, -2);

    // Helper function for query
    const getCustomersByDateRange = async (startDate: Date, endDate?: Date) => {
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
              saleType: 'LOAN',
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
          (sale) => sale.totalRemaining !== sale.totalAmount - sale.discount
        )
      );

      return filteredCustomers;
    };

    // Query 2: Customers who did not pay last month but paid before that
    const oneMonthAgoCustomers = await getCustomersByDateRange(
      twoMonthAgo,
      oneMonthAgo
    );

    // Query 3: Customers who did not pay for more than one month
    const twoMonthsAgoCustomers = await getCustomersByDateRange(twoMonthAgo);

    return {
      oneMonthAgoCustomers,
      twoMonthsAgoCustomers,
    };
  });
}

export async function getExpensesListSpecificTime(data: ReportDateTypes) {
  return tryCatch(async () => {
    const formated = getReportByDateSchema.parse(data);

    const expenses = await prisma.expenses.findMany({
      where: {
        created_at: { gte: formated.from, lte: formated.to },
        deleted_at: null,
      },
    });
    // Calculate total expenses
    const totalExpense = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    ); // Assuming 'amount' is the field for expense value

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

export async function getSalesListSpecificTime(data: ReportDateTypes) {
  return tryCatch(async () => {
    const formated = getReportByDateSchema.parse(data);

    const sales = await prisma.sales.findMany({
      where: {
        saleDate: { gte: formated.from, lte: formated.to },
        deleted_at: null,
        isFinished: true,
      },
    });
    const totalSales = sales.reduce(
      (sum, sale) => sum + sale.totalRemaining,
      0
    );
    const totalSaleObject = {
      id: 0,
      saleNumber: 'کۆی گشتی',
      note: null,
      totalRemaining: totalSales,
      saleDate: new Date(),
    };

    sales.unshift(totalSaleObject as any);
    return selectAndRenameKeysFromArray(sales, keySale);
  });
}

export async function getPurchasesListSpecificTime(data: ReportDateTypes) {
  return tryCatch(async () => {
    const formated = getReportByDateSchema.parse(data);

    const purchases = await prisma.companyPurchase.findMany({
      where: {
        purchaseDate: { gte: formated.from, lte: formated.to },
        deleted_at: null,
      },
    });

    const totalPurchase = purchases.reduce(
      (sum, sale) => sum + sale.totalRemaining,
      0
    );
    const totalPurchaseObject = {
      id: 0,
      name: 'کۆی گشتی',
      note: null,
      totalRemaining: totalPurchase,
      purchaseDate: new Date(),
    };
    purchases.unshift(totalPurchaseObject as any);

    return selectAndRenameKeysFromArray(purchases, keyPurchase);
  });
}

export async function getTradePartnerFromType(data: TradePartnerTypes) {
  return tryCatch(async () => {
    let table = Prisma.sql`customers`;
    const formated = getTradePartnerSchema.parse(data);
    if (formated.type === 'companies') {
      table = Prisma.sql`companies`;
    }

    const tradePartner = await prisma.$queryRaw<TradePartner[]>`
    SELECT * FROM ${table} WHERE deleted_at IS NULL
  `;

    return tradePartner;
  });
}

export async function getReportPartnerFromChart(
  data: getReportChartPartnerTypes
) {
  return tryCatch(async () => {
    const formated = getReportChartPartnerSchema.parse(data);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-indexed (0 = January, 11 = December)
    const currentYear = currentDate.getFullYear();

    const chartData = await Promise.all(
      Array.from({ length: 8 }, async (_, i) => {
        const monthIndex = (currentMonth - i + 12) % 12; // Calculate month index (0-11)
        const year = currentYear - Math.floor((currentMonth - i) / 12); // Adjust year if necessary

        let totalPartnerData: PartnerChartSummary;
        if (formated.type === 'companies') {
          totalPartnerData = await prisma.companyPurchase.aggregate({
            _sum: {
              totalRemaining: true,
            },
            where: {
              companyId: +formated.id,
              purchaseDate: {
                gte: new Date(year, monthIndex, 1), // Start of the month
                lt: new Date(year, monthIndex + 1, 1), // Start of the next month
              },
              deleted_at: null,
            },
          });
        } else {
          totalPartnerData = await prisma.sales.aggregate({
            _sum: {
              totalRemaining: true,
            },
            where: {
              customerId: +formated.id,
              saleDate: {
                gte: new Date(year, monthIndex, 1), // Start of the month
                lt: new Date(year, monthIndex + 1, 1), // Start of the next month
              },
              deleted_at: null,
            },
          });
        }
        const totalRemaining = totalPartnerData._sum.totalRemaining || 0;

        return {
          month: monthIndex + 1, // Month number (1-12)
          totalRemaining,
        };
      })
    );

    // Calculate totals for "now" and "past"
    const nowTotal = chartData
      .slice(0, 4) // Last 4 months
      .reduce((sum, data) => sum + data.totalRemaining, 0);

    const pastTotal = chartData
      .slice(4, 8) // 4 months before the last 4
      .reduce((sum, data) => sum + data.totalRemaining, 0);

    // Calculate percentage change
    const percentageChange =
      pastTotal === 0 ? 0 : ((nowTotal - pastTotal) / pastTotal) * 100;

    // Return the result along with chart data
    return {
      chartData: Array.from({ length: 4 }, (_, i) => {
        const nowMonthIndex = (12 + currentMonth - i) % 12;
        const pastMonthIndex = (12 + currentMonth - i - 4) % 12;

        return {
          month: nowMonthIndex + 1, // Adjust for 1-indexed months
          now:
            chartData.find((data) => data.month === nowMonthIndex + 1)
              ?.totalRemaining || 0,
          past:
            chartData.find((data) => data.month === pastMonthIndex + 1)
              ?.totalRemaining || 0,
        };
      }),
      percentageChange,
    };
  });
}

export async function getLoanSummary(data: ReportTradePartnerTypes) {
  return tryCatch(async () => {
    const formated = getReportTradePartnerSchema.parse(data);
    let loanSummary: LoanSummary;
    if (formated.type === 'companies') {
      loanSummary = await prisma.companyPurchase.aggregate({
        _sum: {
          totalRemaining: true,
          totalAmount: true,
        },
        where: {
          companyId: +data.id,
          purchaseDate: {
            gte: formated.dates.from,
            lte: formated.dates.to,
          },
          deleted_at: null,
        },
      });
    } else {
      loanSummary = await prisma.sales.aggregate({
        _sum: {
          totalRemaining: true,
          totalAmount: true,
          discount: true,
        },
        where: {
          customerId: +data.id,
          saleDate: {
            gte: formated.dates.from,
            lte: formated.dates.to,
          },
          deleted_at: null,
        },
      });
    }

    // Calculate the total money available for loans
    const totalAvailableLoan =
      (loanSummary._sum.totalAmount || 0) -
      (loanSummary._sum?.discount || 0) -
      (loanSummary._sum.totalRemaining || 0);

    return {
      totalRemaining: loanSummary._sum.totalRemaining || 0,
      totalAmount: loanSummary._sum.totalAmount || 0,
      totalDiscount: loanSummary._sum?.discount || 0,
      totalAvailableLoan,
    };
  });
}

export function selectAndRenameKeysFromArray<T extends object>(
  array: T[],
  keyMap: { [K in keyof T]?: string }
): Partial<Record<string, any>>[] {
  return array.map((item) => {
    const selected: Partial<Record<string, any>> = {};
    for (const key in keyMap) {
      if (key in item) {
        selected[keyMap[key] as string] = item[key];
      }
    }
    return selected;
  }) as Array<Pick<T, keyof typeof keyMap>>;
}
