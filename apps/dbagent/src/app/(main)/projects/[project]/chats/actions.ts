'use server';

import { Message } from 'ai';
import { titleModel } from '~/lib/ai/agent';
import { deleteMessagesByChatIdAfterTimestamp, getMessageById } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';

export async function generateTitleFromUserMessage({ message }: { message: Message }) {
  const { text: title } = await titleModel.generateText({ prompt: JSON.stringify(message) });
  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const dbAccess = await getUserSessionDBAccess();
  const [message] = await getMessageById(dbAccess, { id });
  if (!message) {
    throw new Error('Message not found');
  }

  await deleteMessagesByChatIdAfterTimestamp(dbAccess, {
    chatId: message.chatId,
    timestamp: message.createdAt
  });
}
