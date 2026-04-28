import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, locale = 'en-US') {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatCurrency(n: number, currency = 'IQD', locale = 'en-US') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${formatNumber(n, locale)} ${currency}`;
  }
}
