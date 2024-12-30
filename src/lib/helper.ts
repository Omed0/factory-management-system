'use server';

import { unlink } from 'fs';
import path from 'path';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';


export const tryCatch = async <T>(
  fn: () => Promise<T>
): Promise<T | { error: string }> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.flatten();
      const firstKey = Object.keys(errors.fieldErrors)[0];
      return {
        error: firstKey
          ? `${firstKey}: ${errors.fieldErrors[firstKey]?.[0]}`
          : 'تکایە داتای هەڵەداخلی سیستەمەکە مەکە',
      };
    }
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025' || error.code === 'P2016') {
        return { error: `ئەم داتایە نەدۆزرایەوە` };
      }
      if (error.code === 'P2002') {
        const isSaleNumber =
          error.meta?.modelName === 'Sales' ? 'ناوی وەصڵ' : error.meta?.target;
        return { error: `دووبارە ناتوانرێت دانرابێت لە ${isSaleNumber}` };
      }
      return { error: error.message || 'هەڵەیەک لە داتابەیس هەیە' };
    }
    if (error instanceof Error) return { error: error.message };
    return { error: 'هەڵەیەک هەیە' };
  }
};

export async function unlinkImage(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath);
    unlink(fullPath, (err) => {
      if (err) throw err;
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'سڕینەوەی وێنە سەرکەوتوو نەبوو',
    };
  }
}
