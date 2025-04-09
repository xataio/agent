import { UIMessage } from 'ai';
import { cookies } from 'next/headers';
import { Chat } from '~/components/chat/chat';
import { DataStreamHandler } from '~/components/chat/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '~/lib/ai/models';
import { getMessagesByChatId } from '~/lib/db/chats';
import { listConnections } from '~/lib/db/connections';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { Message } from '~/lib/db/schema';

type PageParams = {
  project: string;
  chat: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project, chat } = await params;

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  const suggestedActions = [
    {
      title: 'Are there any performance issues with my database?',
      action: 'Are there any performance issues with my database?'
    },
    {
      title: 'What are the most expensive queries in my database?',
      action: 'What are the most expensive queries in my database?'
    },
    {
      title: 'How can I optimize my database queries?',
      action: 'How can I optimize my database queries?'
    },
    {
      title: 'What are the most common errors in my database?',
      action: 'What are the most common errors in my database?'
    }
  ];

  const dbAccess = await getUserSessionDBAccess();
  const connections = await listConnections(dbAccess, project);

  const messagesFromDb = await getMessagesByChatId(dbAccess, { id: chat });

  function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: '',
      createdAt: message.createdAt
    }));
  }

  return (
    <>
      <Chat
        key={`${chat}-${chat}`}
        id={chat}
        connections={connections}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
        suggestedActions={suggestedActions}
        isReadonly={false}
      />

      <DataStreamHandler id={chat} />
    </>
  );
}
