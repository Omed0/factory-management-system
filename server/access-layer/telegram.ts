import 'server-only';

import { env } from '@/env.mjs';
import { prisma } from '@/lib/client';

// Function to get or update the Telegram token and chatId
export const getOrUpdateTelegramTokenAndChatId = async (): Promise<{
  token: string;
  chatId: string;
}> => {
  try {
    // Fetch the existing token and chatId from the database
    const existingToken = await prisma.telegramToken.findFirst();

    // Get the token and chatId from the environment variables
    const newToken = env.TOKEN_TELEGRAM;
    const newChatId = env.CHAT_ID;

    if (!newToken || !newChatId) {
      throw new Error('تۆکن و چات ئایدی لە فایلی .env نییە.');
    }

    // If no token exists in the database, create a new entry
    if (!existingToken) {
      await prisma.telegramToken.create({
        data: { value: newToken, chatId: newChatId },
      });
      console.log('Token and chatId created in the database.');
      return { token: newToken, chatId: newChatId };
    }

    // If the token or chatId in the environment has changed, update the database
    if (
      existingToken.value !== newToken ||
      existingToken.chatId !== newChatId
    ) {
      await prisma.telegramToken.update({
        where: { id: existingToken.id },
        data: { value: newToken, chatId: newChatId },
      });
      console.log('Token and/or chatId updated in the database.');
      return { token: newToken, chatId: newChatId };
    }

    // If both token and chatId are unchanged, return the existing values
    console.log('Token and chatId remain the same.');
    return { token: existingToken.value, chatId: existingToken.chatId };
  } catch (error: any) {
    console.error('Error managing Telegram token and chatId:', error.message);
    throw new Error(
      `Failed to manage Telegram token and chatId: ${error.message}`
    );
  }
};
