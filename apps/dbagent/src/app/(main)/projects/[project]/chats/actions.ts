'use server';

import { generateText, Message } from 'ai';
import { getModelInstance } from '~/lib/ai/agent';
import { deleteMessagesByChatIdAfterTimestamp, getMessageById } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';

export async function generateTitleFromUserMessage({ message }: { message: Message }) {
  const { text: title } = await generateText({
    model: await getModelInstance('title'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message)
  });

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
