import fs from 'fs';
import path from 'path';
import os from 'os';
import { createConnection } from 'mysql2/promise';
import AdmZip from 'adm-zip';
import { env } from '@/env.mjs';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

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

// Function to restore the database from an SQL file
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
        await connection.query(`TRUNCATE TABLE \`${tableName}\``);
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

// Function to reassemble chunks into a single file
const reassembleChunks = async (
  chunkFiles: string[],
  outputFilePath: string
) => {
  // Sort chunk files by their part number
  chunkFiles.sort((a, b) => {
    const partA = parseInt(a.match(/backup_part(\d+)\.zip/i)?.[1] || '0', 10);
    const partB = parseInt(b.match(/backup_part(\d+)\.zip/i)?.[1] || '0', 10);
    return partA - partB;
  });

  const outputStream = fs.createWriteStream(outputFilePath);

  for (const chunkFile of chunkFiles) {
    const chunkData = fs.readFileSync(chunkFile);
    outputStream.write(chunkData);
  }

  outputStream.end();
  console.log('Chunks reassembled into:', outputFilePath);
};

// API handler for restoring the database
export async function POST(req: Request) {
  try {
    // Parse the form data
    const formData = await req.formData();
    const restoreSource = formData.get('restoreSource') as 'local' | 'upload';
    const files = formData.getAll('files') as File[];

    let zipFilePath: string;

    if (restoreSource === 'local') {
      // Restore from local backup
      zipFilePath = path.resolve('D:/backups', 'backup.zip');
      if (!fs.existsSync(zipFilePath)) {
        throw new Error(`Backup file not found at: ${zipFilePath}`);
      }
    } else if (restoreSource === 'upload') {
      // Restore from uploaded files
      if (!files || files.length === 0) {
        throw new Error('No files uploaded.');
      }

      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      // Save uploaded files to a temporary directory
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(tempDir, file.name);
          const buffer = Buffer.from(await file.arrayBuffer());
          fs.writeFileSync(filePath, buffer);
          return filePath;
        })
      );

      // Check if the uploaded files are chunks
      const isChunks = uploadedFiles.every((file) =>
        /backup_part\d+\.zip/i.test(path.basename(file))
      );

      if (isChunks && uploadedFiles.length > 1) {
        // Reassemble chunks into a single file
        zipFilePath = path.join(tempDir, 'backup_reassembled.zip');
        await reassembleChunks(uploadedFiles, zipFilePath);

        // Clean up chunk files
        for (const file of uploadedFiles) {
          fs.unlinkSync(file);
        }
      } else if (uploadedFiles.length === 1) {
        // Single file (not chunks)
        zipFilePath = uploadedFiles[0];
      } else {
        throw new Error('یان فایل یان فایلەکانی زیپ ئەپلۆد بکە بۆ ڕیستۆرکردن');
      }
    } else {
      throw new Error('هەڵەیەک هەیە');
    }

    // Unzip the backup file
    const outputDir = path.join(os.tmpdir(), 'restore');
    await unzipFile(zipFilePath, outputDir);

    // Find the SQL file inside the unzipped directory
    const sqlFilePath = fs
      .readdirSync(outputDir)
      .find((file) => file.endsWith('.sql'));
    if (!sqlFilePath) {
      throw new Error('هیچ فایلێکی SQL نەدۆزرایەوە لەناو زیپەکە');
    }

    // Restore the database
    await restoreDatabase(path.join(outputDir, sqlFilePath));

    // Cleanup temporary files
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    if (restoreSource === 'upload' && fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
    }

    console.log('Temporary files cleaned up.');

    const message =
      restoreSource === 'local'
        ? 'ڕیستۆرکرا لەسەر کۆمپیوتەرەکەوە'
        : 'ڕیستۆرکرا بە فایلەکانی تێلێگرام';
    return NextResponse.json({ message: 'Success', description: message });
  } catch (error: any) {
    console.error('Error:', error.message);
    return NextResponse.json({
      description: error.message,
      message: 'An error occurred',
    });
  }
}
