import { CoreMessage, Message as SDKMessage } from 'ai';
import { Pool } from 'pg';
import { ExpectStatic } from 'vitest';
import { generateUUID } from '~/components/chat/utils';
import { AgentModelDeps, agentModelDeps, chatModel, getAgentMockDeps } from '~/lib/ai/agent';
import { Tool } from '~/lib/ai/model';
import { getUserDBAccess } from '~/lib/db/db';
import { Connection, Project } from '~/lib/db/schema';
import { getTargetDbPool } from '~/lib/targetdb/db';
import { LLMTurn } from './llmcheck';
import { GenerateTextResponse, traceVercelAiResponse } from './trace';

export const turnFromResponse = (prompt: string, response: GenerateTextResponse): LLMTurn => {
  const allToolCalls = response.steps.flatMap((step) => {
    return step.toolResults.flatMap((toolResult) => {
      return Object.values(toolResult).map((toolCall: any) => ({
        name: toolCall.toolName,
        inputs: toolCall.args,
        output: toolCall.result
      }));
    });
  });

  return {
    input: prompt,
    output: response.text,
    toolCalls: allToolCalls
  };
};

export const evalChat = async ({
  model,
  messages,
  prompt,
  deps,
  dbConnection,
  expect,
  toolCalls
}: {
  model?: string;
  prompt?: string;
  messages?: CoreMessage[] | Omit<SDKMessage, 'id'>[];
  deps?: AgentModelDeps;
  dbConnection?: string;
  expect: ExpectStatic;
  toolCalls?: Record<string, (args: any) => PromiseLike<any>>;
}) => {
  const project: Project = {
    id: 'projectId',
    name: 'projectName',
    cloudProvider: 'aws'
  };

  let targetDb: Pool | undefined;
  if (!deps) {
    if (dbConnection) {
      const connection: Connection = {
        id: generateUUID(),
        name: 'evaldb',
        connectionString: dbConnection,
        projectId: project.id,
        isDefault: true
      };

      targetDb = getTargetDbPool(connection.connectionString);
      const userId = 'evalUser';
      const dbAccess = await getUserDBAccess(userId);
      deps = agentModelDeps({
        withMCP: true,
        targetDb,
        dbAccess,
        connection,
        cloudProvider: project.cloudProvider,
        userId,
        withArtifacts: false
      });
    } else {
      deps = getAgentMockDeps({});
    }
  }

  try {
    const response = await chatModel.generateText({
      model: model,
      maxSteps: 20,
      deps,
      messages,
      prompt,
      tools: (tools: Record<string, Tool<AgentModelDeps>>) => {
        if (toolCalls) {
          for (const [name, execute] of Object.entries(toolCalls)) {
            const tool = tools[name];
            if (!tool) {
              throw new Error(`Tool ${name} not found`);
            }
            tool.execute = execute;
          }
        }
        return tools;
      }
    });
    traceVercelAiResponse(response, expect);
    return response;
  } finally {
    if (targetDb) {
      await targetDb.end();
    }
  }
};
