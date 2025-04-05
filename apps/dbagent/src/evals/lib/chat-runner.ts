import { CoreMessage, generateText, Message } from 'ai';
import { randomUUID } from 'crypto';
import { ExpectStatic } from 'vitest';
import { chatSystemPrompt, getModelInstance, getTools } from '~/lib/ai/aidba';
import { Connection } from '~/lib/db/connections';
import { Project } from '~/lib/db/projects';
import { env } from '~/lib/env/eval';
import { getTargetDbConnection } from '~/lib/targetdb/db';
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
  const connection: Connection = {
    id: randomUUID(),
    name: 'evaldb',
    connectionString: dbConnection,
    projectId: 'projectId',
    isDefault: true
  };
  const project: Project = {
    id: 'projectId',
    name: 'projectName',
    cloudProvider: 'aws'
  };
  const targetClient = await getTargetDbConnection(dbConnection);
  try {
    const response = await generateText({
      model: getModelInstance(env.CHAT_MODEL),
      system: chatSystemPrompt,
      tools: await getTools(project, connection),
      messages,
      maxSteps: 20
    });
    traceVercelAiResponse(response, expect);
    return response;
  } finally {
    await targetClient.end();
  }
};
