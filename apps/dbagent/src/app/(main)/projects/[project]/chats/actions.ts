'use server';

import { Message } from 'ai';
import { AugmentedLanguageModel } from '~/lib/ai/model';
import { getProviderRegistry } from '~/lib/ai/providers';
import { deleteMessagesByChatIdAfterTimestamp, getMessageById } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';

const titleModel = new AugmentedLanguageModel({
  providerRegistry: getProviderRegistry,
  baseModel: 'title',
  systemPrompt: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
  metadata: {
    tags: ['internal', 'chat', 'title']
  }
});

export async function generateTitleFromUserMessage({ message }: { message: Message }) {
  const { text: title } = await titleModel.generateText({
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
