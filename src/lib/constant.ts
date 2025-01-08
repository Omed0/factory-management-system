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

export const defaultDates = {
  from: new Date(new Date().setMonth(currentMonth, 1)).toLocaleDateString(),
  to: new Date(new Date().setMonth(currentMonth + 1, 0)).toLocaleDateString(),
};
