import { CoreMessage, generateText, Message as SDKMessage } from 'ai';
import { ExpectStatic } from 'vitest';
import { generateUUID } from '~/components/chat/utils';
import { getChatSystemPrompt, getModelInstance } from '~/lib/ai/agent';
import { getTools } from '~/lib/ai/tools';
import { Connection, Project } from '~/lib/db/schema';
import { env } from '~/lib/env/eval';
import { getTargetDbPool } from '~/lib/targetdb/db';
import { traceVercelAiResponse } from './trace';

export const evalChat = async ({
  messages,
  dbConnection,
  expect
}: {
  messages: CoreMessage[] | Omit<SDKMessage, 'id'>[];
  dbConnection: string;
  expect: ExpectStatic;
}) => {
  const project: Project = {
    id: 'projectId',
    name: 'projectName',
    cloudProvider: 'aws'
  };

  const connection: Connection = {
    id: generateUUID(),
    name: 'evaldb',
    connectionString: dbConnection,
    projectId: project.id,
    isDefault: true
  };

  const targetDb = getTargetDbPool(connection.connectionString);
  try {
    const tools = await getTools({ project, connection, targetDb, userId: 'evalUser' });
    const response = await generateText({
      model: await getModelInstance(env.CHAT_MODEL),
      system: getChatSystemPrompt({ cloudProvider: project.cloudProvider }),
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
