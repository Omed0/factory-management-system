import { EmployeeActionType } from '@prisma/client';

export const keyExpense = {
  id: 'id',
  title: 'name',
  amount: 'amount',
  created_at: 'date',
  note: 'note',
  dollar: 'dollar',
};

export const keySale = {
  id: 'id',
  type: 'type',
  saleNumber: 'name',
  totalRemaining: 'amount',
  customerId: 'redirectId',
  saleDate: 'date',
  note: 'note',
  dollar: 'dollar',
};

export const keyPurchase = {
  id: 'id',
  name: 'name',
  type: 'type',
  totalRemaining: 'amount',
  companyId: 'redirectId',
  purchaseDate: 'date',
  note: 'note',
  dollar: 'dollar',
};

export type columns_report = {
  id: string;
  name: string;
  type: string;
  amount: number;
  redirectId: string;
  date: string;
  note: string;
  dollar: number;
};

export const report_name = ['expense', 'sale', 'purchase'] as const;

export type ReportName = (typeof report_name)[number];

export const tr_report_name = [
  { name: report_name[0], value: 'خەرجی' },
  { name: report_name[1], value: 'فرۆشتن' },
  { name: report_name[2], value: 'کڕین' },
];

export const report_link = [
  {
    name: report_name[0],
    value: (query: string) => `/expense?name=${query}`,
  },
  {
    name: report_name[1],
    value: (query: string, id: string) => `/customer/${id}?invoice=${query}`,
  },
  {
    name: report_name[2],
    value: (query: string, id: string) => `/company/${id}?invoice=${query}`,
  },
];

export const isShowValue = {
  addition: [
    'sale',
    EmployeeActionType.PUNISHMENT,
    EmployeeActionType.ABSENT,
    null,
  ],
  subtraction: [
    'expense',
    'companyPurchase',
    EmployeeActionType.OVERTIME,
    EmployeeActionType.BONUS,
    null,
  ],
};
