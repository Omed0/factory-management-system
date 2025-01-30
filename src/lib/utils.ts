import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { defaultDates } from './constant';
import { unlinkImage } from './helper';
import { addDays, format } from 'date-fns';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const sleep = (ms = 1000) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function removeEmpty(obj: any) {
  const isFalse = (val: any) =>
    val === false ||
    val === 0 ||
    val === '' ||
    val === null ||
    val === undefined;
  Object.keys(obj).forEach((key) => isFalse(obj[key]) && delete obj[key]);
  return obj;
}

export function getMonthStartAndEndOfMonth(month: number) {
  const currentYear = new Date().getFullYear();
  // Create a date object for the first day of the month
  const startOfMonth = new Date(currentYear, month - 1, 1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Create a date object for the last day of the month
  const endOfMonth = new Date(currentYear, month, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  return { startOfMonth, endOfMonth };
}

export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function serializeBigInt(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export function randomValue(name: string) {
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${name}-${randomString}`;
}

export const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export const IQDtoUSD = (value: number, dollar: number) => {
  const iqdToUsd = 1 / dollar;

  value = value * iqdToUsd;
  return value;
};

export const USDtoIQD = (value: number, dollar: number) => {
  const usdToIqd = dollar; // Assuming dollar is the conversion rate from USD to IQD
  value = value * usdToIqd;
  return value;
};

export const formatCurrency = (
  amount: number,
  dollar: number,
  currency: 'IQD' | 'USD' | string,
  fractionDigit: number = 2
) => {
  if (currency === 'IQD') amount = USDtoIQD(amount, dollar);
  const isUsd = currency === 'USD';
  // Determine if we need to show decimal places
  const showDecimals = amount % 1 !== 0 && isUsd; // Check if amount has a decimal part

  return new Intl.NumberFormat(isUsd ? 'en-US' : 'en-IQ', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: showDecimals ? fractionDigit : 0,
    minimumFractionDigits: showDecimals ? fractionDigit : 0,
  }).format(amount);
};

export function seperateDates(date?: string | null) {
  let dates = {
    from: defaultDates.from,
    to: defaultDates.to,
  };
  if (date?.split('&')) {
    const splitedDate = date?.split('&');
    dates = {
      from: splitedDate[0],
      to: splitedDate[1],
    };
  }
  return dates;
}

export const changeDateToString = (dates: { from: string; to: string }) => {
  const startOfDay = addDays(new Date(dates.from), 1);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = addDays(new Date(dates.to), 1);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return {
    from: startOfDay.toISOString(),
    to: endOfDay.toISOString(),
  };
};

export function getImageData(event: any) {
  const data = event as FileList | null;
  if (!data || !data[0]?.name) return { files: null, displayUrl: null };

  var binaryData = [];
  binaryData.push(data[0]);

  const dataTransfer = new DataTransfer();
  Array.from(data!).forEach((image) => dataTransfer.items.add(image));

  const displayUrl = URL.createObjectURL(
    new Blob(binaryData, { type: 'application/zip' })
  );

  return { files: dataTransfer.files, displayUrl };
}

export async function uploadImageUsingHandler(
  files: FileList,
  updatePath?: string | null
) {
  const file = files[0];
  const formData = new FormData();
  formData.append('image', file);

  if (updatePath) {
    await unlinkImage(updatePath);
  }

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    return {
      success: false,
      message: (await response?.json())?.error || 'ڕەسمەکە خەزن نەبوو',
    };
  }

  return {
    success: true,
    path: (await response.json()).filePath,
  };
}

export const parseCurrency = (formatted: string): number => {
  return parseFloat(formatted.replace(/[^0-9.-]+/g, ''));
};

export const parseDate = (date?: Date | string | null): string => {
  if (!date) return '';
  if (typeof date === 'string')
    return format(new Date(date).toISOString().split('T')[0], 'dd/MM/yyyy');
  return format(date, 'dd/MM/yyyy');
};
