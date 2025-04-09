import { CoreMessage, generateText, Message } from 'ai';
import { randomUUID } from 'crypto';
import { ExpectStatic } from 'vitest';
import { getChatSystemPrompt, getModelInstance, getTools } from '~/lib/ai/aidba';
import { Connection } from '~/lib/db/connections';
import { Project } from '~/lib/db/projects';
import { env } from '~/lib/env/eval';
import { getTargetDbPool } from '~/lib/targetdb/db';
import { traceVercelAiResponse } from './trace';

export const evalChat = async ({
  messages,
  dbConnection,
  expect
}: {
  messages: CoreMessage[] | Omit<Message, 'id'>[];
  dbConnection: string;
  expect: ExpectStatic;
}) => {
  const project: Project = {
    id: 'projectId',
    name: 'projectName',
    cloudProvider: 'aws'
  };

  const connection: Connection = {
    id: randomUUID(),
    name: 'evaldb',
    connectionString: dbConnection,
    projectId: project.id,
    isDefault: true
  };

  const targetDb = getTargetDbPool(connection.connectionString);
  try {
    const tools = await getTools(project, connection, targetDb);
    const response = await generateText({
      model: getModelInstance(env.CHAT_MODEL),
      system: getChatSystemPrompt(project),
      maxSteps: 20,
      tools,
      messages
    });
    traceVercelAiResponse(response, expect);
    return response;
  } finally {
    await targetDb.end();
  }
};
