//import { env } from '@/env.mjs';
import { EmployeeActionType } from '@prisma/client';
import { addDays } from 'date-fns';

//export const siteConfig = {
//  title: 'zanyar group',
//  description: 'zanyar group',
//  keywords: () => [],
//  url: () => env.APP_URL,
//};

export const FALLBACK_IMAGE = "/placeholder.jpg"

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
  [EmployeeActionType.ABSENT, "مۆڵەت"],
  [EmployeeActionType.BONUS, "پاداشت"],
  [EmployeeActionType.OVERTIME, "کارکردنی زیادە"],
  [EmployeeActionType.PUNISHMENT, "سزادان"],
]);

export const subtraction_actions = [EmployeeActionType.ABSENT, EmployeeActionType.PUNISHMENT]
export const addition_actions = [EmployeeActionType.OVERTIME, EmployeeActionType.BONUS]

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

export const defaultDates = {
  from: new Date(currentYear, currentMonth, 1),
  to: addDays(new Date(currentYear, currentMonth, 1), 30),
}