import fs from 'fs';
import path from 'path';
import os from 'os';
import TelegramBot from 'node-telegram-bot-api';
import mysqldump from 'mysqldump';
import archiver from 'archiver';
import { env } from '@/env.mjs';
import { NextResponse } from 'next/server';

function createConnectionTelegram() {
  // Initialize Telegram bot
  const token = env.TOKEN_TELEGRAM;
  const chatId = env.CHAT_ID; // Telegram chat ID for sending backups
  const bot = new TelegramBot(token, { polling: false });
  return { bot, chatId };
}

// Utility function to ensure a directory exists
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created: ${dirPath}`);
  }
};

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
  maxSize = 49 * 1024 * 1024
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const fileStats = fs.statSync(filePath);
    if (fileStats.size <= maxSize) return resolve([filePath]); // No splitting needed

    const chunks: string[] = [];
    const readStream = fs.createReadStream(filePath);
    let currentChunk = Buffer.alloc(0);
    let chunkIndex = 1;

    readStream.on('data', (chunk) => {
      currentChunk = Buffer.concat([
        currentChunk,
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
      ]);

      if (currentChunk.length >= maxSize) {
        const chunkFilePath = path.join(
          os.tmpdir(),
          `backup_part${chunkIndex}.zip`
        );
        fs.writeFileSync(chunkFilePath, currentChunk);
        chunks.push(chunkFilePath);
        currentChunk = Buffer.alloc(0);
        chunkIndex++;
      }
    });

    readStream.on('end', () => {
      if (currentChunk.length > 0) {
        const chunkFilePath = path.join(
          os.tmpdir(),
          `backup_part${chunkIndex}.zip`
        );
        fs.writeFileSync(chunkFilePath, currentChunk);
        chunks.push(chunkFilePath);
      }
      resolve(chunks);
    });

    readStream.on('error', (err) =>
      reject(`Error reading file: ${err.message}`)
    );
  });
};

// Function to send files as a group to Telegram
const sendFilesToTelegram = async (filePaths: string[]) => {
  for (const filePath of filePaths) {
    try {
      const { bot, chatId } = createConnectionTelegram();
      const fileStream = fs.createReadStream(filePath);
      await bot.sendDocument(chatId, fileStream, {
        caption: `Part: ${path.basename(filePath)}`,
        disable_notification: true,
      });
      console.log(`Backup part sent: ${filePath}`);
    } catch (error: any) {
      console.error('Error sending file to Telegram:', error.message);
      throw new Error(`Error sending file: ${error.message}`);
    }
  }
};

// API handler to perform database dump, zip, split, and send operations
export async function POST(req: Request) {
  try {
    const formData = await req.formData(); // Get upload option from request
    const isUploadToDrive = formData.get('uploadToDrive') === 'local';

    const dumpFilePath = path.join(os.tmpdir(), 'backup.sql');
    const zipFilePath = path.join(os.tmpdir(), 'backup.zip');

    // Step 1: Generate the MySQL dump
    await mysqldump({
      connection: {
        host: 'localhost',
        user: 'root',
        password: '', // MySQL password
        database: 'system-managment',
      },
      dumpToFile: dumpFilePath,
    });
    console.log(`Database dump created at: ${dumpFilePath}`);

    // Step 2: Create a ZIP file
    await createZip(dumpFilePath, zipFilePath);

    if (isUploadToDrive) {
      // Save to local directory
      const destinationPath = path.resolve('D:/Backups', 'backup.zip');
      ensureDirectoryExists(path.dirname(destinationPath));
      fs.copyFileSync(zipFilePath, destinationPath);
      console.log(`Backup saved to: ${destinationPath}`);
    } else {
      // Send the ZIP file to Telegram
      const { bot } = createConnectionTelegram(); // Initialize Telegram bot
      // Step 3: Split the ZIP file if necessary
      const chunks = await splitFile(zipFilePath);

      // Step 4: Send each chunk to Telegram
      await sendFilesToTelegram(chunks);

      // Clean up chunk files
      for (const chunk of chunks) {
        fs.unlinkSync(chunk);
      }

      // Ensure the bot stops properly
      if (bot.isPolling()) {
        await bot.stopPolling();
      }
      await bot.close();
    }

    // Clean up the main dump and ZIP files
    if (fs.existsSync(dumpFilePath)) {
      fs.unlinkSync(dumpFilePath);
    }
    if (fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
    }

    const message = isUploadToDrive
      ? 'بەسەرکەوتووی باکئەپ کرا بۆ کۆمپیوتەرەکە'
      : 'بەسەرکەوتووی باکئەپ کرا بۆ تێلەگرام';

    return NextResponse.json({ message: 'سەرکەوتووبوو', description: message });
  } catch (error: any) {
    console.error('Error:', error.message);
    // Return the error response
    if (error.response.statusCode === 429) {
      return NextResponse.json({ message: 'ئەپڵۆدکرا باکئەپەکە' });
    }
    return NextResponse.json({
      description: error.message,
      message: 'هەڵەیەک ڕوویدا',
    });
  }
}
