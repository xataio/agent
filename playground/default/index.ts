import { Agent } from '@mastra/core/agent';
import { AnswerRelevancyMetric, PromptAlignmentMetric } from '@mastra/evals/llm';
import { CompletenessMetric } from '@mastra/evals/nlp';
import { CloudProvider } from '~/lib/db/schema';

import { openai } from '@ai-sdk/openai';
import { getChatSystemPrompt, getMonitoringSystemPrompt } from '~/lib/ai/agent';
import { getBuiltinProviderRegistry } from '~/lib/ai/providers';
import { buildPlaygroundTools } from '../tools';

/* eslint-disable no-process-env */
const defaultModel = getBuiltinProviderRegistry()
  .languageModel(process.env.MASTRA_MODEL ?? 'chat')
  .instance();
const cloudProvider = (process.env.MASTRA_CLOUD_PROVIDER ?? 'aws') as CloudProvider;
const defaultTools = buildPlaygroundTools({
  projectConnection: process.env.MASTRA_PROJECT_CONNECTION ?? undefined,
  dbUrl: process.env.MASTRA_DB_URL ?? undefined,
  userId: process.env.MASTRA_USER_ID ?? undefined
});
/* eslint-enable no-process-env */

const chatPrompt = getChatSystemPrompt({ cloudProvider });
const monitoringPrompt = getMonitoringSystemPrompt({ cloudProvider });

export function createAgents() {
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
      instructions: monitoringPrompt,
      model: defaultModel,
      tools: defaultTools,
      evals: {
        ...evals,
        'prompt-alignment': new PromptAlignmentMetric(openai('gpt-4o-mini'), {
          instructions: [monitoringPrompt],
          scale: 1 // Scale for the final score
        })
      }
    }),
    chatAgent: new Agent({
      name: 'chat-agent',
      instructions: chatPrompt,
      model: defaultModel,
      tools: defaultTools,
      evals: {
        ...evals,
        'prompt-alignment': new PromptAlignmentMetric(openai('gpt-4o-mini'), {
          instructions: [chatPrompt],
          scale: 1 // Scale for the final score
        })
      }
    })
  };
}
