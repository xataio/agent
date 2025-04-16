import { UIMessage } from 'ai';
import { notFound } from 'next/navigation';
import { ReadOnlyChat } from '~/components/chat/chat';
import { getChatById, getMessagesByChatId } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { Message } from '~/lib/db/schema';

type PageParams = {
  chat: string;
};

export default async function SharedChatPage({ params }: { params: Promise<PageParams> }) {
  const { chat: chatId } = await params;

  // Get DB access for reading the chat
  const dbAccess = await getUserSessionDBAccess();

  // Fetch the chat and check if it's public
  const chatData = await getChatById(dbAccess, { id: chatId });

  // If the chat doesn't exist or is not public, return 404
  if (!chatData || chatData.visibility !== 'public') {
    notFound();
  }

  // Fetch the messages for the chat
  const messagesFromDb = await getMessagesByChatId(dbAccess, { id: chatId });

  function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts ?? [],
      role: message.role,
      content:
        message.parts
          ?.filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('\n')
          .trim() ?? '',
      createdAt: message.createdAt
    }));
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">{chatData.title}</h1>
        <p className="text-muted-foreground text-sm">
          Shared chat (read-only) • Created on {new Date(chatData.createdAt).toLocaleDateString()}
        </p>
      </div>

      <ReadOnlyChat messages={convertToUIMessages(messagesFromDb)} />
    </div>
  );
}
