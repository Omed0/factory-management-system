import fs from 'fs';
import path from 'path';
import os from 'os';
import TelegramBot from 'node-telegram-bot-api';
import { createConnection } from 'mysql2/promise';
import AdmZip from 'adm-zip';
import { env } from '@/env.mjs';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Function to create a connection to Telegram
function createConnectionTelegram() {
  // Initialize Telegram bot
  const token = env.TOKEN_TELEGRAM;
  const chatId = env.CHAT_ID; // Telegram chat ID for fetching backups
  const bot = new TelegramBot(token, { polling: false });
  return { bot, chatId };
}

// Utility function to unzip a file
const unzipFile = async (
  zipFilePath: string,
  outputDir: string
): Promise<string> => {
  try {
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(outputDir, true);
    console.log(`Unzipped file to: ${outputDir}`);
    return outputDir;
  } catch (err: any) {
    throw new Error(`Failed to unzip file: ${err.message}`);
  }
};

const restoreDatabase = async (sqlFilePath: string) => {
  const connection = await createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  try {
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found at path: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    if (!sqlContent.trim()) {
      throw new Error('SQL file is empty.');
    }

    console.log('Using database:', env.DB_NAME);

    // Disable foreign key checks to allow truncating tables with foreign keys
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Get table names from the information schema
    const [tables] = await connection.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [env.DB_NAME]
    );

    // Ensure the result is an array and contains table names
    if (Array.isArray(tables)) {
      for (const table of tables) {
        const tableName = (table as any)['TABLE_NAME'];
        console.log('Truncating table:', tableName);
        await connection.query(`TRUNCATE TABLE \`${tableName}\``); // Use TRUNCATE with the correct table name
      }
    } else {
      console.log('No tables found in the database.');
    }

    // Re-enable foreign key checks after truncating
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // Execute the SQL dump to restore the database
    await connection.query(sqlContent);

    console.log('Database restored successfully!');
    revalidatePath('/(root)', 'layout');
  } catch (error: any) {
    console.error('Error restoring database:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

// Function to fetch the latest backup file from Telegram
const fetchLatestBackupFromTelegram = async (): Promise<string> => {
  try {
    const { bot, chatId } = createConnectionTelegram();
    // Get the latest updates from the specified chat
    const updates = await bot.getUpdates({ limit: 10, offset: -1 });
    // Filter for documents of mime type 'application/zip'
    const documents = updates
      .flatMap((update) => update.message?.document || [])
      .filter((doc) => doc.mime_type === 'application/zip');

    console.log('Documents found:', documents); // Log the documents found

    if (documents.length === 0) {
      throw new Error('No backup files found in the specified Telegram chat.');
    }

    // Get the latest document (the last one in the list)
    const latestDocument = documents[documents.length - 1];
    const file = await bot.getFile(latestDocument.file_id);

    // Define the destination path for saving the backup file
    const destinationPath = path.join(
      os.tmpdir(),
      latestDocument.file_name || 'backup.zip'
    );

    // Fetch the file from Telegram's file server
    const response = await fetch(
      `https://api.telegram.org/file/bot${env.TOKEN_TELEGRAM}/${file.file_path}`
    );

    if (!response.body) {
      throw new Error('Response body is null or undefined');
    }

    // Create a write stream to save the file locally
    const fileStream = fs.createWriteStream(destinationPath);
    const reader = response.body.getReader();

    // Stream the file content to the local file
    await new Promise<void>((resolve, reject) => {
      const pump = () => {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              fileStream.close();
              resolve();
              return;
            }
            fileStream.write(value, 'binary', pump);
          })
          .catch(reject);
      };
      pump();
    });

    console.log(
      `Downloaded backup file from Telegram chat ${chatId} to: ${destinationPath}`
    );
    return destinationPath;
  } catch (error: any) {
    console.error('Error fetching backup from Telegram:', error.message);
    throw error;
  }
};

// API handler for restoring the database
export async function POST(req: Request) {
  try {
    const { bot } = createConnectionTelegram();
    const formData = await req.formData();
    const restoreSource = formData.get('restoreSource') as 'local' | 'telegram';

    let zipFilePath: string;

    if (restoreSource === 'local') {
      // Fetch backup from local directory
      zipFilePath = path.resolve('D:/backups', 'backup.zip');
      if (!fs.existsSync(zipFilePath)) {
        throw new Error(`Backup file not found at: ${zipFilePath}`);
      }
    } else {
      // Fetch the latest backup file from Telegram
      zipFilePath = await fetchLatestBackupFromTelegram();

      if (bot.isPolling()) {
        await bot.stopPolling();
      }
      await bot.close();
    }
    // Unzip the backup file
    const outputDir = path.join(os.tmpdir(), 'restore');
    await unzipFile(zipFilePath, outputDir);

    // Find the SQL file inside the unzipped directory
    const sqlFilePath = fs
      .readdirSync(outputDir)
      .find((file) => file.endsWith('.sql'));
    if (!sqlFilePath) {
      throw new Error('No SQL file found in the backup archive.');
    }
    // Restore the database
    await restoreDatabase(path.join(outputDir, sqlFilePath));

    // Cleanup temporary files
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
      console.log('Temporary files cleaned up.');
    }

    const message =
      restoreSource === 'local'
        ? 'ڕیستۆر کرا لەسەر کۆمپیوتەر'
        : 'ڕیستۆر کرا لەسەر تێلەگرام';
    return NextResponse.json({ message: 'سەرکەوتووبوو', description: message });
  } catch (error: any) {
    console.error('Error:', error.message);
    return NextResponse.json({
      description: error.message,
      message: 'هەڵەیەک ڕوویدا',
    });
  }
}
