'use server';

//import { Readable } from 'stream';
//import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
//import os from 'os';

export const sendFilesToTelegram = async (
  filePaths: string[],
  token: string,
  chatId: string
) => {
  // Get the current date in the format YYYY-MM-DD
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(currentDate.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  for (const filePath of filePaths) {
    try {
      // Get the original filename and extension
      const originalFilename = path.basename(filePath);
      const extension = path.extname(originalFilename);
      const filenameWithoutExtension = path.basename(
        originalFilename,
        extension
      );

      // Create a new filename with the current date
      const newFilename = `${filenameWithoutExtension}_${dateString}${extension}`;

      // Create FormData and append the file with the new filename
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append(
        'document',
        new Blob([fs.readFileSync(filePath)]),
        newFilename // Use the new filename here
      );
      formData.append('caption', `Part: ${newFilename}`);
      formData.append('disable_notification', 'true');

      // Send the file to Telegram
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendDocument`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(
          `هەڵەیەک لەناردنی فایل بۆ تێلێگرام هەیە: ${response.statusText}`
        );
      }

      console.log(`Backup part sent: ${newFilename}`);
    } catch (error: any) {
      console.error('Error sending file to Telegram:', error.message);
      throw new Error(`Error sending file: ${error.message}`);
    }
  }
};

//export const fetchAllChunksFromChannel = async (
//  token: string,
//  chatId: string
//): Promise<string[]> => {
//  try {
//    // Fetch messages from the channel
//    const messagesResponse = await fetch(
//      `https://api.telegram.org/bot${token}/getChatHistory?chat_id=${chatId}&limit=100`
//    );
//    if (!messagesResponse.ok) {
//      throw new Error(
//        `Failed to fetch messages: ${messagesResponse.statusText}`
//      );
//    }

//    const messages = await messagesResponse.json();
//    if (!messages.ok || !messages.result) {
//      throw new Error('Invalid response from Telegram API');
//    }

//    // Find all backup chunks in the messages
//    const chunks = messages.result
//      .flatMap((message: any) => message.document || [])
//      .filter(
//        (doc: any) =>
//          doc.file_name?.startsWith('backup_part') &&
//          doc.file_name?.endsWith('.zip')
//      )
//      .sort((a: any, b: any) => {
//        // Sort chunks by part number (e.g., backup_part1.zip, backup_part2.zip)
//        const partA = parseInt(a.file_name.match(/\d+/)[0], 10);
//        const partB = parseInt(b.file_name.match(/\d+/)[0], 10);
//        return partA - partB;
//      });

//    if (!chunks.length) {
//      throw new Error(
//        'No backup chunks found in the specified Telegram channel.'
//      );
//    }

//    // Download all chunks
//    const chunkPaths: string[] = [];
//    for (const chunk of chunks) {
//      const fileId = chunk.file_id;

//      // Get the file's download path
//      const fileResponse = await fetch(
//        `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
//      );
//      if (!fileResponse.ok) {
//        throw new Error(
//          `Failed to fetch file info: ${fileResponse.statusText}`
//        );
//      }

//      const fileInfo = await fileResponse.json();
//      if (!fileInfo.ok || !fileInfo.result) {
//        throw new Error('Invalid file info response from Telegram API');
//      }

//      const filePath = fileInfo.result.file_path;

//      // Download the chunk
//      const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
//      const downloadResponse = await fetch(downloadUrl);
//      if (!downloadResponse.ok) {
//        throw new Error(
//          `Failed to download file: ${downloadResponse.statusText}`
//        );
//      }

//      const destinationPath = path.join(os.tmpdir(), chunk.file_name);

//      const fileStream = fs.createWriteStream(destinationPath);

//      await new Promise<void>(async (resolve, reject) => {
//        if (!downloadResponse.body) {
//          reject(new Error('Response body is null'));
//          return;
//        }

//        try {
//          const readableStream = Readable.fromWeb(downloadResponse.body as any);
//          await pipeline(readableStream, fileStream);
//          console.log(`Chunk downloaded: ${chunk.file_name}`);
//          resolve();
//        } catch (err: any) {
//          console.error('Error downloading chunk:', err.message);
//          reject(err);
//        }
//      });

//      chunkPaths.push(destinationPath);
//    }

//    return chunkPaths;
//  } catch (error: any) {
//    console.error('Error fetching chunks:', error.message);
//    throw error;
//  }
//};

//export const reassembleChunks = async (
//  chunkPaths: string[],
//  outputFilePath: string
//): Promise<void> => {
//  try {
//    const outputStream = fs.createWriteStream(outputFilePath);

//    for (const chunkPath of chunkPaths) {
//      const chunkStream = fs.createReadStream(chunkPath);
//      await new Promise<void>((resolve, reject) => {
//        chunkStream.pipe(outputStream, { end: false });
//        chunkStream.on('end', resolve);
//        chunkStream.on('error', reject);
//      });
//    }

//    outputStream.end();
//    console.log(`Chunks reassembled into: ${outputFilePath}`);
//  } catch (error: any) {
//    console.error('Error reassembling chunks:', error.message);
//    throw error;
//  }
//};
