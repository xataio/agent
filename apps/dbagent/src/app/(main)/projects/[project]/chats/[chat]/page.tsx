import { UIMessage } from 'ai';
import { DataStreamHandler } from '~/components/chat/artifacts/data-stream-handler';
import { Chat } from '~/components/chat/chat';
import { getDefaultLanguageModel } from '~/lib/ai/providers';
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
  const defaultLanguageModel = getDefaultLanguageModel();

  const messagesFromDb = await getMessagesByChatId(dbAccess, { id: chat });

  function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts ?? [],
      role: message.role,
      // Note: content will soon be deprecated in @ai-sdk/react
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
    <>
      <Chat
        key={`${chat}-${chat}`}
        id={chat}
        projectId={project}
        defaultLanguageModel={defaultLanguageModel.info().id}
        connections={connections}
        initialMessages={convertToUIMessages(messagesFromDb)}
        suggestedActions={suggestedActions}
      />

      <DataStreamHandler id={chat} />
    </>
  );
}
