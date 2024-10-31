"use server"

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { writeFile, mkdir } from "fs/promises";
import { ZodError } from "zod";
import { getWeekNumber } from "./utils";
import path from "path";
import { unlink } from "fs";

export const tryCatch = async <T>(fn: () => Promise<T>): Promise<T | { error: string }> => {
    try {
        return await fn();
    } catch (error) {
        if (error instanceof ZodError) return { error: error.message };
        if (error instanceof PrismaClientKnownRequestError)
            return { error: error.message };
        if (error instanceof Error) return { error: error.message };
        return { error: 'هەڵەیەک هەیە' };
    }
};


export async function uploadImage(file: File | Blob) {

    if (!file) return { success: false, error: "No file provided" };
    const bytes = 'arrayBuffer' in file ? await file.arrayBuffer() : await new Response(file).arrayBuffer();
    const buffer = Buffer.from(bytes);

    const date = new Date();
    const year = date.getFullYear();
    const weekNumber = getWeekNumber(date);
    const weekFolder = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    const uploadDir = path.join(process.cwd(), "public", "images", weekFolder);

    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileExtension = file instanceof File ? path.extname(file.name) : '.jpg';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const fileName = `image-${day}.${month}.${year}.${uniqueSuffix}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Write the file
    await writeFile(filePath, buffer);

    // Return the relative path for client use
    const relativePath = path.join("images", weekFolder, fileName)
        .replace(/\\/g, '/'); // Convert all backslashes to forward slashes

    if (!relativePath) return { success: false, error: "Failed to upload image" };

    return { success: true, filePath: relativePath };
}

export async function unlinkImage(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
        const fullPath = path.join(process.cwd(), 'public', filePath);
        unlink(fullPath, (err) => {
            if (err) throw err
        });
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'سڕینەوەی ئیمەیج سەرکەوتوو نەبوو'
        };
    }
}
