import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const sleep = (ms = 1000) =>
    new Promise((resolve) => setTimeout(resolve, ms));


export function removeEmpty(obj: any) {
    const isFalse = (val: any) =>
        val === false ||
        val === 0 ||
        val === "" ||
        val === null ||
        val === undefined;
    Object.keys(obj).forEach((key) => isFalse(obj[key]) && delete obj[key]);
    return obj;
}


export function getMonthStartAndEndOfMonth(date: Date) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 2);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    endOfMonth.setUTCHours(23, 59, 59, 999);

    return { startOfMonth, endOfMonth }
}


export function getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function serializeBigInt(data: any) {
    return JSON.parse(JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ))
}

export function randomValue(name: string) {
    const randomString = Math.random().toString(36).substring(2, 10);
    return `${name}-${randomString}`;
}


export const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
};

export const IQDtoUSD = (value: number, dollar: number) => {
    const iqdToUsd = 1 / dollar

    value = value * iqdToUsd
    return value
}

export const USDtoIQD = (value: number, dollar: number) => {
    const usdToIqd = dollar; // Assuming dollar is the conversion rate from USD to IQD
    value = value * usdToIqd;
    return value;
}

export const formatCurrency = (
    amount: number,
    dollar: number,
    currency: "IQD" | "USD" | string,
    fractionDigit: number = 2
) => {
    if (currency === "IQD") amount = USDtoIQD(amount, dollar);
    const type = currency === "USD";
    // Determine if we need to show decimal places
    const showDecimals = amount % 1 !== 0; // Check if amount has a decimal part

    return new Intl.NumberFormat(type ? "en-US" : "en-IQ", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: showDecimals ? fractionDigit : 0,
        minimumFractionDigits: showDecimals ? fractionDigit : 0,
    }).format(amount);
}

