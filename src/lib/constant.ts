import { EmployeeActionType } from '@prisma/client';

export const FALLBACK_IMAGE = '/placeholder.jpg';

export const months = [
  { name: 'مانگی ١', value: 1 },
  { name: 'مانگی ٢', value: 2 },
  { name: 'مانگی ٣', value: 3 },
  { name: 'مانگی ٤', value: 4 },
  { name: 'مانگی ٥', value: 5 },
  { name: 'مانگی ٦', value: 6 },
  { name: 'مانگی ٧', value: 7 },
  { name: 'مانگی ٨', value: 8 },
  { name: 'مانگی ٩', value: 9 },
  { name: 'مانگی ١٠', value: 10 },
  { name: 'مانگی ١١', value: 11 },
  { name: 'مانگی ١٢', value: 12 },
];

export const tr_employee_action = new Map<EmployeeActionType, string>([
  [EmployeeActionType.ABSENT, 'مۆڵەت'],
  [EmployeeActionType.BONUS, 'پاداشت'],
  [EmployeeActionType.OVERTIME, 'کارکردنی زیادە'],
  [EmployeeActionType.PUNISHMENT, 'سزادان'],
]);

export const tr_define_name_type_table = new Map<string, string>([
  ['expense', 'خەرجی'],
  ['companyPurchase', 'کڕین'],
  ['sale', 'فرۆشتن'],
  ['BONUS', 'پاداشت'],
  ['PUNISHMENT', 'سزادان'],
  ['ABSENT', 'مۆڵەت'],
  ['OVERTIME', 'کارکردنی زیادە'],
]);

export const tr_type_calculated = new Map<string, string>([
  ['expense', 'پارەدان'],
  ['companyPurchase', 'پارەدان'],
  ['sale', 'پارەوەرگرتن'],
  ['BONUS', 'پارەدان'],
  ['PUNISHMENT', 'پارەوەرگرتن'],
  ['ABSENT', 'پارەوەرگرتن'],
  ['OVERTIME', 'پارەدان'],
]);

export const redirect_to_page_name = [
  {
    name: 'expense',
    value: (q: string) => `/expense?name=${q}`,
  },
  {
    name: 'company',
    value: (q: string, id?: number | null) =>
      `${id ? `/company/${id}?invoice=${q}` : `/report/self-invoice?name=${q}`}`,
  },
  {
    name: 'customer',
    value: (q: string, id?: number | null) =>
      `${id ? `/customer/${id}?invoice=${q}` : `/report/self-invoice?saleNumber=${q}`}`,
  },
  {
    name: 'employee',
    value: (q: string, id?: number | null) =>
      `${id ? `/employee?name=${q}` : `/report/employee?name=سڕاوەتەوە`}`,
  },
];

export const addition_actions = [
  // those addition money to box
  EmployeeActionType.ABSENT,
  EmployeeActionType.PUNISHMENT,
] as const;

export const subtraction_actions = [
  // those subtraction money from box
  EmployeeActionType.OVERTIME,
  EmployeeActionType.BONUS,
] as const;

export const now = new Date();
export const currentYear = now.getFullYear();
export const currentMonth = now.getMonth();

export const defaultDates = {
  from: new Date(new Date().setMonth(currentMonth, 1)).toLocaleDateString(), // First day of the month
  to: new Date(new Date().setMonth(currentMonth + 1, 0)).toLocaleDateString(), // Last day of the month
};

export const fastSaleCustomer = {
  name: 'فرۆشتنی خێرا',
};
