import { CoreMessage, generateText, Message } from 'ai';
import { randomUUID } from 'crypto';
import { chatSystemPrompt, getModelInstance, getTools } from '~/lib/ai/aidba';
import { Connection } from '~/lib/db/connections';
import { getTargetDbConnection } from '~/lib/targetdb/db';
import { traceVercelAiResponse } from './trace';

export const evalChat = async ({
  messages,
  dbConnection
}: {
  messages: CoreMessage[] | Omit<Message, 'id'>[];
  dbConnection: string;
}) => {
  const connection: Connection = {
    id: randomUUID(),
    name: 'evaldb',
    connectionString: dbConnection,
    projectId: 'projectId',
    isDefault: true
  };
  const targetClient = await getTargetDbConnection(dbConnection);

  const response = await generateText({
    model: getModelInstance('anthropic-claude-3-5-haiku-20241022'),
    system: chatSystemPrompt,
    tools: await getTools(connection, targetClient),
    messages,
    maxSteps: 20
  });
  traceVercelAiResponse(response);
  targetClient.end();
  return response;
};
