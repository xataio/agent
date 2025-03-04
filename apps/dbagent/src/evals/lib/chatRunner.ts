import { CoreMessage, generateText, Message } from 'ai';
import { randomUUID } from 'crypto';
import { chatSystemPrompt, getModelInstance, getTools } from '~/lib/ai/aidba';
import { DbConnection } from '~/lib/db/connections';
import { getTargetDbConnection } from '~/lib/targetdb/db';
import { traceVercelAiResponse } from './trace';

// const dbConnection = 'postgresql://username:password@localhost:9876/limit?sslmode=require';
const dbConnection =
  'postgresql://neondb_owner:O2ahTeMFP0Rk@ep-small-morning-a5gsb2uq-pooler.us-east-2.aws.neon.tech/limit?sslmode=require';

export const evalChat = async ({ messages }: { messages: CoreMessage[] | Omit<Message, 'id'>[] }) => {
  const connectionDb: DbConnection = {
    id: randomUUID(),
    name: 'evaldb',
    connstring: dbConnection,
    isDefault: true
  };
  const targetClient = await getTargetDbConnection(dbConnection);

  const response = await generateText({
    model: getModelInstance('anthropic-claude-3-5-haiku-20241022'),
    system: chatSystemPrompt,
    tools: await getTools(connectionDb, targetClient),
    messages,
    maxSteps: 20
  });
  traceVercelAiResponse(response);
  return response;
};
