import { streamText } from 'ai';
import { getChatSystemPrompt, getModelInstance, getTools } from '~/lib/ai/aidba';
import { getConnection } from '~/lib/db/connections';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getProjectById } from '~/lib/db/projects';
import { getTargetDbPool } from '~/lib/targetdb/db';

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

  const dbAccess = await getUserSessionDBAccess();
  const connection = await getConnection(dbAccess, connectionId);
  if (!connection) {
    return new Response('Connection not found', { status: 404 });
  }
  const project = await getProjectById(dbAccess, connection.projectId);
  if (!project) {
    return new Response('Project not found', { status: 404 });
  }
  try {
    const context = getChatSystemPrompt(project);

    console.log(context);

    const modelInstance = getModelInstance(model);

    const targetDb = getTargetDbPool(connection.connectionString);
    const tools = await getTools(project, connection, targetDb);
    const result = streamText({
      model: modelInstance,
      messages,
      system: context,
      tools: tools,
      maxSteps: 20,
      toolCallStreaming: true,
      onFinish: async (_result) => {
        await targetDb.end();
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
