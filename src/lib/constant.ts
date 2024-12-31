//import { env } from '@/env.mjs';
import { EmployeeActionType } from '@prisma/client';
import { addDays } from 'date-fns';

//export const siteConfig = {
//  title: 'zanyar group',
//  description: 'zanyar group',
//  keywords: () => [],
//  url: () => env.APP_URL,
//};

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

export const subtraction_actions = [
  EmployeeActionType.ABSENT,
  EmployeeActionType.PUNISHMENT,
] as const;
export const addition_actions = [
  EmployeeActionType.OVERTIME,
  EmployeeActionType.BONUS,
] as const;

export const now = new Date();
export const currentYear = now.getFullYear();
export const currentMonth = now.getMonth();

// Helper function to get the last day of the month
const getLastDayOfMonthUTC = (year: number, month: number): Date => {
  const date = new Date(Date.UTC(year, month + 1, 0));
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

export const defaultDates = {
  from: new Date(Date.UTC(currentYear, currentMonth, 1)), // UTC date for the first day of the current month
  to: getLastDayOfMonthUTC(currentYear, currentMonth), // UTC date for the last day of the current month
};
