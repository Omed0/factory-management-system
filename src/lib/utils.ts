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
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { startOfMonth, endOfMonth }
}


export function getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}