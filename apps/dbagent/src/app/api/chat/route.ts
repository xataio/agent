import { appendResponseMessages, streamText } from 'ai';
import { chatSystemPrompt, getModelInstance, getTools } from '~/lib/ai/aidba';
import { ChatMemory } from '~/lib/ai/memory';
import { getConnection } from '~/lib/db/connections';

export const runtime = 'nodejs';
export const maxDuration = 30;

function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  console.log(JSON.stringify(error));

  return JSON.stringify(error);
}

export async function POST(req: Request) {
  const { chatId, messages, connectionId, model } = await req.json();
  const userMessages = messages.map((m: { createdAt?: string | Date }) => ({
    ...m,
    createdAt: m?.createdAt ? (typeof m.createdAt === 'string' ? new Date(m.createdAt) : m.createdAt) : new Date()
  }));

  const connection = await getConnection(connectionId);
  if (!connection) {
    return new Response('Connection not found', { status: 404 });
  }
  try {
    const memory = new ChatMemory(chatId);
    const context = chatSystemPrompt;

    const modelInstance = getModelInstance(model);
    const history = await memory.getMessages();

    const result = streamText({
      model: modelInstance,
      messages: [...history, ...userMessages],
      system: context,
      tools: await getTools(connection),
      maxSteps: 20,
      toolCallStreaming: true,
      onFinish: async (response) => {
        const responseMessages = appendResponseMessages({
          messages: userMessages,
          responseMessages: response.response.messages
        }).map((m) => {
          // If the message id starts with msg, it's response message. Vites AI
          // generates ids like this. The DB currently expects UUIDs.
          return {
            ...m,
            id: m.id?.startsWith('msg') ? crypto.randomUUID() : (m.id ?? crypto.randomUUID())
          };
        });

        await memory.addMessages(responseMessages);
      }
    });

    return result.toDataStreamResponse({
      getErrorMessage: errorHandler
    });
  } catch (error) {
    console.error('Error in chat', error);
    return new Response('Error in chat', { status: 500 });
  }
}
