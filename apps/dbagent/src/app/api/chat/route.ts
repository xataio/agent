import { UIMessage, appendResponseMessages, createDataStreamResponse, smoothStream, streamText } from 'ai';
import { NextRequest } from 'next/server';
import { generateTitleFromUserMessage } from '~/app/(main)/projects/[project]/chats/actions';
import { auth } from '~/auth';
import { generateUUID } from '~/components/chat/utils';
import { getChatSystemPrompt, getModelInstance, getTools } from '~/lib/ai/aidba';
import { deleteChatById, getChatById, getChatsByUserId, saveChat, saveMessages } from '~/lib/db/chats';
import { getConnection } from '~/lib/db/connections';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getProjectById } from '~/lib/db/projects';
import { getTargetDbPool } from '~/lib/targetdb/db';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const dbAccess = await getUserSessionDBAccess();

  const chats = await getChatsByUserId(dbAccess, { id: session.user.id, limit });

  return Response.json({ chats });
}

export async function POST(request: Request) {
  try {
    const { id, messages, connectionId, model } = await request.json();

    const dbAccess = await getUserSessionDBAccess();
    const connection = await getConnection(dbAccess, connectionId);
    if (!connection) {
      return new Response('Connection not found', { status: 404 });
    }

    const project = await getProjectById(dbAccess, connection.projectId);
    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById(dbAccess, { id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage
      });

      await saveChat(dbAccess, { id, userId: session.user.id, projectId: connection.projectId, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    await saveMessages(dbAccess, {
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          projectId: connection.projectId,
          role: 'user',
          parts: userMessage.parts,
          createdAt: new Date()
        }
      ]
    });

    const targetDb = getTargetDbPool(connection.connectionString);
    const context = getChatSystemPrompt(project);
    const modelInstance = getModelInstance(model);
    const tools = await getTools(project, connection, targetDb);

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: modelInstance,
          system: context,
          messages,
          maxSteps: 20,
          toolCallStreaming: true,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools,
          onFinish: async ({ response }) => {
            try {
              const assistantId = getTrailingMessageId({
                messages: response.messages.filter((message) => message.role === 'assistant')
              });

              if (!assistantId) {
                throw new Error('No assistant message found!');
              }

              const [, assistantMessage] = appendResponseMessages({
                messages: [userMessage],
                responseMessages: response.messages
              });

              if (!assistantMessage) {
                throw new Error('No assistant message found!');
              }

              await saveMessages(dbAccess, {
                messages: [
                  {
                    id: assistantId,
                    projectId: connection.projectId,
                    chatId: id,
                    role: assistantMessage.role,
                    parts: assistantMessage.parts,
                    createdAt: new Date()
                  }
                ]
              });
            } catch (_) {
              console.error('Failed to save chat');
            }

            await targetDb.end();
          }
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, { sendReasoning: true });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      }
    });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 404
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const dbAccess = await getUserSessionDBAccess();

  try {
    const chat = await getChatById(dbAccess, { id });

    if (chat?.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById(dbAccess, { id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500
    });
  }
}

function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getTrailingMessageId({ messages }: { messages: Array<{ id: string }> }): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}
