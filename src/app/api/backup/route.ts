import fs from 'fs';
import path from 'path';
import os from 'os';
import mysqldump from 'mysqldump';
import archiver from 'archiver';
import { env } from '@/env.mjs';
import { NextResponse } from 'next/server';
import { ensureDirectoryExists } from '@/lib/helper';
import { getOrUpdateTelegramTokenAndChatId } from '@/server/access-layer/telegram';
import { sendFilesToTelegram } from '@/lib/telegramUtils';

const MAX_FILE_SIZE = 49 * 1024 * 1024; // 49 MB (to stay under Telegram's 50 MB limit)

// Function to create a ZIP file
const createZip = (
  filePath: string,
  outputZipPath: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(
        `ZIP file created: ${outputZipPath} (${archive.pointer()} bytes)`
      );
      resolve(outputZipPath);
    });

    archive.on('error', (err: Error) => reject(err));

    archive.pipe(output);
    archive.file(filePath, { name: path.basename(filePath) });
    archive.finalize();
  });
};

// Function to split a large file into smaller chunks
const splitFile = (
  filePath: string,
  maxSize: number = MAX_FILE_SIZE
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const fileStats = fs.statSync(filePath);
    if (fileStats.size <= maxSize) {
      return resolve([filePath]); // No splitting needed
    }

    // Get the current date in the format YYYY-MM-DD
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const chunks: string[] = [];
    const readStream = fs.createReadStream(filePath, {
      highWaterMark: maxSize,
    });
    let chunkIndex = 1;

    readStream.on('data', (chunk) => {
      const chunkFilePath = path.join(
        os.tmpdir(),
        `backup_part${chunkIndex}_${dateString}.zip` // Include date in the filename
      );
      fs.writeFileSync(chunkFilePath, chunk);
      chunks.push(chunkFilePath);
      chunkIndex++;
    });

    readStream.on('end', () => {
      console.log(`File split into ${chunks.length} parts.`);
      resolve(chunks);
    });

    readStream.on('error', (err) => {
      reject(`Error reading file: ${err.message}`);
    });
  });
};

// API handler to perform database dump, zip, split, and send operations
export async function POST(req: Request) {
  let dumpFilePath: string | null = null;
  let zipFilePath: string | null = null;
  let chunks: string[] = [];

  try {
    const formData = await req.formData(); // Get upload option from request
    const isUploadToDrive = formData.get('uploadToDrive') === 'local';

    dumpFilePath = path.join(os.tmpdir(), 'backup.sql');
    zipFilePath = path.join(os.tmpdir(), 'backup.zip');

    // Step 1: Generate the MySQL dump
    await mysqldump({
      connection: {
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
      },
      dumpToFile: dumpFilePath,
    });
    console.log(`Database dump created at: ${dumpFilePath}`);

    // Step 2: Create a ZIP file
    await createZip(dumpFilePath, zipFilePath);

    if (isUploadToDrive) {
      // Save to local directory
      const destinationPath = path.join('D:', 'Backups', 'backup.zip');
      ensureDirectoryExists(path.dirname(destinationPath));
      fs.copyFileSync(zipFilePath, destinationPath);
      console.log(`Backup saved to: ${destinationPath}`);
    } else {
      // Step 3: Get the token and chatId (from database or .env)
      const { token, chatId } = await getOrUpdateTelegramTokenAndChatId();

      // Step 4: Split the ZIP file if necessary
      chunks = await splitFile(zipFilePath);

      // Step 5: Send each chunk to Telegram
      await sendFilesToTelegram(chunks, token, chatId);
    }

    const message = isUploadToDrive
      ? 'باکئەپ کرا بۆ کۆمپیتەرەکە'
      : 'باکئەپ بۆ تێلیگرام ناردرا';

    return NextResponse.json({
      message: 'سەرکەوتوو بوو',
      description: message,
    });
  } catch (error: any) {
    console.error('Error:', error.message);
    return NextResponse.json({
      description: error.message,
      message: 'هەڵەیەک ڕویدا',
    });
  } finally {
    // Clean up temporary files
    if (dumpFilePath && fs.existsSync(dumpFilePath)) {
      fs.unlinkSync(dumpFilePath);
    }
    if (zipFilePath && fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
    }
    for (const chunk of chunks) {
      if (fs.existsSync(chunk)) {
        fs.unlinkSync(chunk);
      }
    }
  }
}
