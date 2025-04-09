import { CoreMessage, generateText, Message } from 'ai';
import { randomUUID } from 'crypto';
import { ExpectStatic } from 'vitest';
import { chatSystemPrompt, getModelInstance, getTools } from '~/lib/ai/aidba';
import { Connection } from '~/lib/db/connections';
import { env } from '~/lib/env/eval';
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

  const { tools, end } = await getTools(connection);
  try {
    const response = await generateText({
      model: getModelInstance(env.CHAT_MODEL),
      system: chatSystemPrompt,
      maxSteps: 20,
      tools,
      messages
    });
    traceVercelAiResponse(response, expect);
    return response;
  } finally {
    await end();
  }
};
