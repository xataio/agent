import { streamText } from 'ai';
import { chatSystemPrompt, getModelInstance, getTools } from '~/lib/ai/aidba';
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
  const { messages, connectionId, model } = await req.json();

  const connection = await getConnection(connectionId);
  if (!connection) {
    return new Response('Connection not found', { status: 404 });
  }
  try {
    const context = chatSystemPrompt;

    console.log(context);

    const modelInstance = getModelInstance(model);
    const { tools, end } = await getTools(connection);
    try {
      const result = streamText({
        model: modelInstance,
        messages,
        system: context,
        tools: tools,
        maxSteps: 20,
        toolCallStreaming: true
      });

      return result.toDataStreamResponse({
        getErrorMessage: errorHandler
      });
    } finally {
      await end();
    }
  } catch (error) {
    console.error('Error in chat', error);
    return new Response('Error in chat', { status: 500 });
  }
}
