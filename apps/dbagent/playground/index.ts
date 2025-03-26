import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { AnswerRelevancyMetric, PromptAlignmentMetric } from '@mastra/evals/llm';
import { CompletenessMetric } from '@mastra/evals/nlp';

import { openai } from '@ai-sdk/openai';
import { Tool } from 'ai';
import { commonToolset, DBSQLTools, mergeToolsets, playbookToolset, Toolset } from '~/lib/ai/tools';
import { chatSystemPrompt, getModelInstance, monitoringSystemPrompt } from '../src/lib/ai/aidba';

function buildMastraTools(): Record<string, Tool> {
  const env = {
    MASTRA_DB_CONNECTION_ID: process.env.MASTRA_DB_CONNECTION_ID ?? undefined,
    MASTRA_DB_URL: process.env.MASTRA_DB_URL ?? undefined
  };

  var toolsets: Toolset[] = [commonToolset, playbookToolset];

  let connString: string | null = env.MASTRA_DB_URL ?? null;

  /// XXX: The use of 'Connection' currently breaks the playground due to next dependency issues.
  // if (env?.MASTRA_DB_CONNECTION_ID && env.MASTRA_DB_CONNECTION_ID !== '') {
  //   const connGetter = createConnectionGetter(env.MASTRA_DB_CONNECTION_ID);

  //   toolsets.push(new DBClusterTools(async () => {
  //     const connection = await connGetter();
  //     return { connection, asUserId: undefined }
  //   }));

  //   if (!connString) {
  //     toolsets.push(new DBSQLTools(async () => (await connGetter()).connectionString));
  //   }
  // }

  if (!!connString) {
    toolsets.push(new DBSQLTools(async () => connString));
  }

  return mergeToolsets(...toolsets);
}

/// XXX: The import of 'Connection' currently breaks the playground due to next dependency issues.
// function createConnectionGetter(connectionId: string): () => Promise<Connection> {
//    let cachedConnection: Connection | null = null;
//    return async () => {
//      if (cachedConnection) {
//        return cachedConnection;
//      }
//      const connection = await getConnection(connectionId);
//      if (!connection) {
//        throw new Error('Connection not found');
//      }
//      cachedConnection = connection;
//      return connection;
//    }
// }

const defaultModel = getModelInstance(process.env.MASTRA_MODEL ?? 'openai-gpt-4o-mini');
const defaultTools = buildMastraTools();

function createAgents() {
  const evals = {
    completeness: new CompletenessMetric(),
    relevancy: new AnswerRelevancyMetric(openai('gpt-4o-mini'), {
      uncertaintyWeight: 0.3, // Weight for 'unsure' verdicts
      scale: 1 // Scale for the final score
    })
  };

  // TODO: create agent per supported model (assuming we have the keys)?
  return {
    monitoringAgent: new Agent({
      name: 'monitoring-agent',
      instructions: monitoringSystemPrompt,
      model: defaultModel,
      tools: defaultTools,
      evals: {
        ...evals,
        'prompt-alignment': new PromptAlignmentMetric(openai('gpt-4o-mini'), {
          instructions: [monitoringSystemPrompt],
          scale: 1 // Scale for the final score
        })
      }
    }),
    chatAgent: new Agent({
      name: 'chat-agent',
      instructions: chatSystemPrompt,
      model: defaultModel,
      tools: defaultTools,
      evals: {
        ...evals,
        'prompt-alignment': new PromptAlignmentMetric(openai('gpt-4o-mini'), {
          instructions: [chatSystemPrompt],
          scale: 1 // Scale for the final score
        })
      }
    })
  };
}

export const mastra = new Mastra({
  agents: createAgents()
});
