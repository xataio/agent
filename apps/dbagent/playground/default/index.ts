import { Agent } from '@mastra/core/agent';
import { AnswerRelevancyMetric, PromptAlignmentMetric } from '@mastra/evals/llm';
import { CompletenessMetric } from '@mastra/evals/nlp';

import { openai } from '@ai-sdk/openai';
import { chatSystemPrompt, getModelInstance, monitoringSystemPrompt } from '~/lib/ai/aidba';
import { buildPlaygroundTools } from '../tools';

const defaultModel = getModelInstance(process.env.MASTRA_MODEL ?? 'openai-gpt-4o-mini');
const defaultTools = buildPlaygroundTools({
  projectConnection: process.env.MASTRA_PROJECT_CONNECTION ?? undefined,
  dbUrl: process.env.MASTRA_DB_URL ?? undefined,
  userId: process.env.MASTRA_USER_ID ?? undefined
});

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
