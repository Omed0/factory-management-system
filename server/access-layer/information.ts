import 'server-only';

import { prisma } from '@/lib/client';
import { tryCatch } from '@/lib/helper';
import {
  DashboardInfoTypes,
  getDashboardInfoSchema,
  getInfoAboutBoxSchema,
  getPartnersLoanSchema,
  getReportByDateSchema,
  getReportChartPartnerSchema,
  getReportChartPartnerTypes,
  getReportTradePartnerSchema,
  getTradePartnerSchema,
  InfoAboutBoxTypes,
  PartnersLoanTypes,
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
import { addMonths } from 'date-fns';
import { calculateTotalAmount } from './box';
import { addition_actions, subtraction_actions } from '@/lib/constant';
import { EmployeeActionType, Prisma } from '@prisma/client';

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

export async function getDashboardInformation(data?: DashboardInfoTypes) {
  return tryCatch(async () => {
    const formated = getDashboardInfoSchema.parse({ ...data });

    const [
      totalPurchasesData,
      customers,
      salesData,
      employeeActions,
      totalMoneyInBox,
    ] = await Promise.all([
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
      prisma.employeeActions.findMany({
        where: {
          dateAction: { gte: formated.from, lte: formated.to },
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

    const addition_employee_actions = employeeActions.reduce(
      (sum, action) =>
        addition_actions.includes(
          action.type as (typeof addition_actions)[number]
        )
          ? sum + action.amount
          : sum,
      0
    );
    const subtraction_employee_actions = employeeActions.reduce(
      (sum, action) =>
        subtraction_actions.includes(
          action.type as (typeof subtraction_actions)[number]
        )
          ? sum + action.amount
          : sum,
      0
    );

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
      addition_employee_actions,
      subtraction_employee_actions,
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
    const now = new Date(new Date().setUTCHours(23, 59, 59, 999));
    const oneMonthAgo = addMonths(now, -1);
    const twoMonthsAgo = addMonths(now, -2);

    // Helper function to fetch customers by date range
    const getCustomersByDateRange = async (
      firstMonth: Date,
      secondMonth?: Date
    ) => {
      const sales = await prisma.sales.findMany({
        where: {
          saleType: 'LOAN',
          deleted_at: null,
        },
        include: { paidLoans: true, customer: true },
      });

      const filteredSales = sales.filter((sale) => {
        const lastPaymentDate = sale.paidLoans.length
          ? sale.paidLoans[sale.paidLoans.length - 1].paidDate
          : sale.saleDate;

        const isFinishPaid =
          sale.totalRemaining !== sale.totalAmount - (sale.discount || 0);

        return (
          isFinishPaid &&
          (secondMonth
            ? lastPaymentDate < secondMonth && lastPaymentDate > firstMonth
            : lastPaymentDate < firstMonth)
        );
      });

      return filteredSales;
    };

    // Query 1: Customers who didn't pay last month but paid before that
    const oneMonthAgoCustomers = await getCustomersByDateRange(
      twoMonthsAgo,
      oneMonthAgo
    );

    // Query 2: Customers who didn't pay for more than two months
    const twoMonthsAgoCustomers = await getCustomersByDateRange(twoMonthsAgo);

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

export type CombinedData = {
  id: number | null;
  name: string | null;
  createdAt: Date | null;
  dollar: number | null;
  note: string | null;
  partner: string | null;
  type: 'expense' | 'sale' | 'companyPurchase' | EmployeeActionType | null;
  pathname: string | null;
  addition: number;
  subtraction: number;
  balance: number;
};

export async function getDetailActionBox(date?: InfoAboutBoxTypes) {
  return tryCatch(async () => {
    const parsedDate = date ? getInfoAboutBoxSchema.parse(date) : null;
    const from = parsedDate?.from || null;
    const to = parsedDate?.to || null;

    const combinedData: CombinedData[] = await prisma.$queryRaw`
    WITH CombinedData AS (
      SELECT 
        e.id, 
        e.title AS name, 
        e.created_at AS createdAt, 
        e.dollar, 
        NULL AS partner, 
        'expense' AS type,
        'expense' AS pathname,
        0 AS addition, -- Expenses do not add to balance
        e.amount AS subtraction -- Expenses decrease the balance
      FROM Expenses e
      WHERE (${from} IS NULL OR ${to} IS NULL OR e.created_at BETWEEN ${from} AND ${to})
      
      UNION ALL

      SELECT 
          cp.id, 
          cp.name, 
          cp.purchaseDate AS createdAt, 
          cp.dollar, 
          com.name AS partner, 
          'companyPurchase' AS type,
          'company' AS pathname,
          0 AS addition, -- Purchases do not add to balance
          cp.totalRemaining AS subtraction -- Purchases decrease the balance
        FROM CompanyPurchase cp
        LEFT JOIN Companies com ON cp.companyId = com.id
        WHERE (${from} IS NULL OR ${to} IS NULL OR cp.purchaseDate BETWEEN ${from} AND ${to})
        
      UNION ALL
      
      SELECT 
        s.id, 
        s.saleNumber AS name, 
        s.saleDate AS createdAt, 
        s.dollar, 
        c.name AS partner, 
        'sale' AS type,
        'customer' AS pathname,
        s.totalRemaining AS addition, -- Sales increase the balance
        0 AS subtraction -- Sales do not decrease the balance
      FROM Sales s
      LEFT JOIN Customers c ON s.customerId = c.id
      WHERE (${from} IS NULL OR ${to} IS NULL OR s.saleDate BETWEEN ${from} AND ${to})
      
      UNION ALL
      
      SELECT 
        ea.id, 
        emp.name AS name, 
        ea.dateAction AS createdAt, 
        ea.dollar, 
        emp.name AS partner, 
        ea.type AS type,
        'employee' AS pathname,
        CASE WHEN ea.type IN ('PUNISHMENT', 'ABSENT') THEN ea.amount ELSE 0 END AS addition, -- Additions are calculated based on the type
        CASE WHEN ea.type IN ('OVERTIME', 'BONUS') THEN ea.amount ELSE 0 END AS subtraction -- Subtractions are calculated based on the type
      FROM EmployeeActions ea
      LEFT JOIN Employee emp ON ea.employeeId = emp.id
      WHERE (${from} IS NULL OR ${to} IS NULL OR ea.dateAction BETWEEN ${from} AND ${to})
    )
    SELECT 
      *,
      @running_balance := @running_balance + (addition - subtraction) AS balance
    FROM CombinedData, (SELECT @running_balance := 0) AS vars
    ORDER BY createdAt;
  `;

    // Calculate totals for additions and subtractions
    const totalAdditions = combinedData.reduce(
      (sum, data) => sum + data.addition,
      0
    );
    const totalSubtractions = combinedData.reduce(
      (sum, data) => sum + data.subtraction,
      0
    );

    // Calculate final balance
    const finalBalance = totalAdditions - totalSubtractions;

    // Add summary row
    combinedData.push({
      id: null,
      name: null,
      createdAt: null,
      dollar: null,
      note: null,
      partner: 'کۆی گشتی',
      type: null,
      pathname: null,
      addition: totalAdditions,
      subtraction: totalSubtractions,
      balance: finalBalance,
    });

    return combinedData;
  });
}

export type PartnersLoan = {
  id: number;
  name: string;
  invoice: string;
  date: Date;
  totalAmount: number;
  discount: number;
  totalRemaining: number;
  dollar: number;
};

export async function getPartnersLoan(t: PartnersLoanTypes) {
  return tryCatch(async () => {
    // Parse the input type using the schema
    const { type } = getPartnersLoanSchema.parse({ ...t });
    // Base query for customers
    const customersQuery = `
      SELECT 
        c.id, 
        c.name, 
        s.saleNumber AS invoice, 
        s.saleDate AS date, 
        s.totalAmount AS totalAmount, 
        s.discount AS discount, 
        s.totalRemaining AS totalRemaining,
        s.dollar AS dollar
      FROM Customers c
      JOIN Sales s ON c.id = s.customerId
      WHERE s.saleType = 'LOAN' 
        AND s.totalRemaining != s.totalAmount - s.discount
        AND s.deleted_at IS NULL AND c.deleted_at IS NULL
    `;

    // Base query for companies
    const companiesQuery = `
      SELECT 
        com.id, 
        com.name, 
        cp.name AS invoice, 
        cp.purchaseDate AS date, 
        cp.totalAmount AS totalAmount, 
        cp.totalRemaining AS totalRemaining,
        0 AS discount,
        cp.dollar AS dollar
      FROM Companies com
      JOIN CompanyPurchase cp ON com.id = cp.companyId
      WHERE cp.type = 'LOAN'
        AND cp.totalRemaining != cp.totalAmount
        AND cp.deleted_at IS NULL AND com.deleted_at IS NULL
    `;

    // Use query based on the type
    let partnersLoan: PartnersLoan[] | null = null;
    if (type === 'customer') {
      partnersLoan = (await prisma.$queryRawUnsafe(
        customersQuery
      )) as PartnersLoan[];
    } else {
      partnersLoan = (await prisma.$queryRawUnsafe(
        companiesQuery
      )) as PartnersLoan[];
    }
    return partnersLoan;
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
