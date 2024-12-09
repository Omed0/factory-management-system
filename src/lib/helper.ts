'use server';

import { unlink } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';

import { getWeekNumber } from './utils';

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
      return { error: 'هەڵەیەک لە داتابەیس هەیە' };
    }
    if (error instanceof Error) return { error: error.message };
    return { error: 'هەڵەیەک هەیە' };
  }
};

export async function uploadImage(file: File | Blob) {
  if (!file) return { success: false, error: 'No file provided' };
  const bytes =
    'arrayBuffer' in file
      ? await file.arrayBuffer()
      : await new Response(file).arrayBuffer();
  const buffer = Buffer.from(bytes);

  const date = new Date();
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  const weekFolder = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  const uploadDir = path.join(process.cwd(), 'public', 'images', weekFolder);

  // Create directory if it doesn't exist
  await mkdir(uploadDir, { recursive: true });

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const fileExtension = file instanceof File ? path.extname(file.name) : '.jpg';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const fileName = `image-${day}.${month}.${year}.${uniqueSuffix}${fileExtension}`;
  const filePath = path.join(uploadDir, fileName);

  // Write the file
  await writeFile(filePath, buffer);

  // Return the relative path for client use
  const relativePath = path
    .join('images', weekFolder, fileName)
    .replace(/\\/g, '/'); // Convert all backslashes to forward slashes

  if (!relativePath)
    return { success: false, error: 'دانانی وێنە سەرکەوتوو نەبوو' };

  return { success: true, filePath: relativePath };
}

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
