import { Agent } from '@mastra/core/agent';
import { AnswerRelevancyMetric } from '@mastra/evals/llm';
import { CompletenessMetric } from '@mastra/evals/nlp';
import { CloudProvider } from '~/lib/db/schema';

import { openai } from '@ai-sdk/openai';
import { Mastra } from '@mastra/core';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { z } from 'zod';
import { getChatSystemPrompt, getMonitoringSystemPrompt } from '~/lib/ai/agent';
import { getProviderRegistry } from '~/lib/ai/providers';
import { buildPlaygroundTools } from './tools';

/* eslint-disable no-process-env */
const cloudProvider = process.env.MASTRA_CLOUD_PROVIDER ?? ('aws' as CloudProvider);

export const runtimeContextSchema = z.object({
  cloudProvider: z.enum(['other', 'aws', 'gcp']).default(cloudProvider as any as CloudProvider),
  model_id: z.string().default(process.env.MASTRA_MODEL ?? 'chat'),
  projectConnection: process.env.MASTRA_PROJECT_CONNECTION
    ? z.string().default(process.env.MASTRA_PROJECT_CONNECTION)
    : z.string().optional(),
  dbUrl: process.env.MASTRA_DB_URL ? z.string().default(process.env.MASTRA_DB_URL) : z.string().optional(),
  userId: process.env.MASTRA_USER_ID ? z.string().default(process.env.MASTRA_USER_ID) : z.string().optional()
});
/* eslint-enable no-process-env */

// verify runtimeContextSchema

export function createAgents() {
  const evals = {
    completeness: new CompletenessMetric(),
    relevancy: new AnswerRelevancyMetric(openai('gpt-4o-mini'), {
      uncertaintyWeight: 0.3, // Weight for 'unsure' verdicts
      scale: 1 // Scale for the final score
    })
  };

  const defaultOptions = {
    model: getModel,
    tools: getTools,
    evals: {
      ...evals
    }
  };

  // TODO: create agent per supported model (assuming we have the keys)?
  return {
    monitoringAgent: new Agent({
      name: 'monitoring-agent',
      ...defaultOptions,
      instructions: ({ runtimeContext }) => {
        return getMonitoringSystemPrompt({ cloudProvider: runtimeContext.get('cloudProvider') });
      }
    }),
    chatAgent: new Agent({
      name: 'chat-agent',
      ...defaultOptions,
      instructions: ({ runtimeContext }) => {
        return getChatSystemPrompt({ cloudProvider: runtimeContext.get('cloudProvider') });
      }
    })
  };
}

const getModel = async ({ runtimeContext }: { runtimeContext: RuntimeContext }) => {
  const { model_id } = runtimeContextSchema.parse(runtimeContext);
  console.log('model_id', model_id);
  const registry = await getProviderRegistry();
  return registry.languageModel(model_id || 'chat', true).instance();
};

const getTools = async ({ runtimeContext }: { runtimeContext: RuntimeContext }) => {
  const entries = runtimeContextSchema.parse(runtimeContext);
  console.log('entries', entries);
  return await buildPlaygroundTools(entries);
};

export const mastra = new Mastra({
  agents: createAgents()
});
