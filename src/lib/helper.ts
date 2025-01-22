'use server';

import fs, { unlink } from 'fs';
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

// Function to ensure a directory exists
export const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created: ${dirPath}`);
  }
};

/**
 * Add "import 'server-only'" at the top of the file.
 * @param filePath - The file path to modify.
 */
function addServerOnlyImport(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const importLine = "import 'server-only';";
  const lines = fileContent.split('\n');

  if (lines[0] !== importLine) {
    lines.unshift(importLine);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`Added "import 'server-only';" to ${filePath}`);
  }
}

/**
 * Remove "import 'server-only'" from the top of the file.
 * @param filePath - The file path to modify.
 */
function removeServerOnlyImport(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const importLine = "import 'server-only';";
  const lines = fileContent.split('\n');

  if (lines[0] === importLine) {
    lines.shift();
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`Removed "import 'server-only';" from ${filePath}`);
  }
}

/**
 * Wrapper function to handle removing and adding the import dynamically.
 * @param filePaths - Array of file paths to process.
 * @param callback - The main function logic to execute.
 */
export async function processFilesWithImport(
  filePaths: string[],
  callback: () => void
) {
  try {
    // Remove the import line from all files
    filePaths.forEach(removeServerOnlyImport);

    // Execute the main function logic
    await callback();
  } finally {
    // Add the import line back to all files
    filePaths.forEach(addServerOnlyImport);
  }
}
