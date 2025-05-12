import { CoreMessage, Message as SDKMessage } from 'ai';
import { ExpectStatic } from 'vitest';
import { generateUUID } from '~/components/chat/utils';
import { agentModelDeps, chatModel, getChatSystemPrompt } from '~/lib/ai/agent';
import { getUserDBAccess } from '~/lib/db/db';
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

  const userId = 'evalUser';
  const targetDb = getTargetDbPool(connection.connectionString);
  const dbAccess = await getUserDBAccess(userId);
  try {
    const response = await chatModel.generateText({
      model: env.CHAT_MODEL,
      system: getChatSystemPrompt({ cloudProvider: project.cloudProvider }),
      maxSteps: 20,
      deps: agentModelDeps({
        withMCP: true,
        targetDb,
        dbAccess,
        connection,
        cloudProvider: project.cloudProvider,
        userId,
        withArtifacts: false
      }),
      messages
    });
    traceVercelAiResponse(response, expect);
    return response;
  } finally {
    await targetDb.end();
  }
};
