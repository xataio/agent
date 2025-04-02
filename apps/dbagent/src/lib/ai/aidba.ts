import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { ProviderV1 } from '@ai-sdk/provider';
import { createProviderRegistry, customProvider, LanguageModelV1, Provider, Tool } from 'ai';
import { env } from '~/lib/env/server';
import { Connection } from '../db/connections';
import { commonToolset, getDBClusterTools, getDBSQLTools, mergeToolsets, playbookToolset } from './tools';

const OpenAIChatModelIds = [
  'o1',
  'o1-2024-12-17',
  'o1-mini',
  'o1-mini-2024-09-12',
  'o1-preview',
  'o1-preview-2024-09-12',
  'o3-mini',
  'o3-mini-2025-01-31',
  'gpt-4o',
  'gpt-4o-2024-05-13',
  'gpt-4o-2024-08-06',
  'gpt-4o-2024-11-20',
  'gpt-4o-audio-preview',
  'gpt-4o-audio-preview-2024-10-01',
  'gpt-4o-audio-preview-2024-12-17',
  'gpt-4o-mini',
  'gpt-4o-mini-2024-07-18',
  'gpt-4-turbo',
  'gpt-4-turbo-2024-04-09',
  'gpt-4-turbo-preview',
  'gpt-4-0125-preview',
  'gpt-4-1106-preview',
  'gpt-4',
  'gpt-4-0613',
  'gpt-4.5-preview',
  'gpt-4.5-preview-2025-02-27',
  'gpt-3.5-turbo-0125',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-1106',
  'chatgpt-4o-latest'
];

const OpenAIEmbeddingModelIds = ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'];

const OpenAIImageModelIds = ['dall-e-3', 'dall-e-2'];

const DeepSeekChatModelIds = ['deepseek-chat', 'deepseek-reasoner'];

export const commonSystemPrompt = `
You are an AI assistant expert in PostgreSQL and database administration.
Your name is Xata Agent.
Always answer SUCCINCTLY and to the point.
Be CONCISE.
`;

export const chatSystemPrompt = `${commonSystemPrompt}
Provide clear, concise, and accurate responses to questions.
Use the provided tools to get context from the PostgreSQL database to answer questions.
When asked why a query is slow, call the explainQuery tool and also take into account the table sizes.
During the initial assessment use the getTablesAndInstanceInfo, getPerfromanceAndVacuumSettings,
and getPostgresExtensions tools.
When asked to run a playbook, use the getPlaybook tool to get the playbook contents. Then use the contents of the playbook
as an action plan. Execute the plan step by step.
`;

export const monitoringSystemPrompt = `${commonSystemPrompt}
You are now executing a periodic monitoring task.
You are provided with a playbook name and a set of tools that you can use to execute the playbook.
First thing you need to do is call the getPlaybook tool to get the playbook contents.
Then use the contents of the playbook as an action plan. Execute the plan step by step.
At the end of your execution, print a summary of the results.
`;

export async function getTools(connection: Connection, asUserId?: string): Promise<Record<string, Tool>> {
  const dbTools = getDBSQLTools(connection.connectionString);
  const clusterTools = getDBClusterTools(connection, asUserId);
  return mergeToolsets(commonToolset, playbookToolset, dbTools, clusterTools);
}

function buildOpenAIProvider(): Provider | null {
  if (!env.OPENAI_API_KEY && !env.OPENAI_BASE_URL) {
    return null;
  }
  if (env.OPENAI_API_KEY && !env.OPENAI_BASE_URL) {
    return createOpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  const openAIProvider = createOpenAI({
    ...(env.OPENAI_API_KEY ? { apiKey: env.OPENAI_API_KEY } : {}),
    baseURL: env.OPENAI_BASE_URL
  });
  if (!env.OPENAI_MODEL_PREFIX) {
    return openAIProvider;
  }

  return customProvider({
    languageModels: Object.fromEntries(
      OpenAIChatModelIds.map((modelId) => [modelId, openAIProvider.languageModel(env.OPENAI_MODEL_PREFIX + modelId)])
    ),
    textEmbeddingModels: Object.fromEntries(
      OpenAIEmbeddingModelIds.map((modelId) => [
        modelId,
        openAIProvider.textEmbeddingModel(env.OPENAI_MODEL_PREFIX + modelId)
      ])
    ),
    imageModels: Object.fromEntries(
      OpenAIImageModelIds.map((modelId) => [modelId, openAIProvider.imageModel(env.OPENAI_MODEL_PREFIX + modelId)])
    )
  });
}

function buildDeepSeekProvider(): Provider | null {
  if (!env.DEEPSEEK_API_KEY) {
    return null;
  }
  if (!env.DEEPSEEK_BASE_URL) {
    return deepseek as Provider;
  }
  const baseProvider = createOpenAI({ apiKey: env.DEEPSEEK_API_KEY, baseURL: env.DEEPSEEK_BASE_URL });
  return customProvider({
    languageModels: Object.fromEntries(
      DeepSeekChatModelIds.map((modelId) => [modelId, baseProvider.languageModel(env.DEEPSEEK_MODEL_PREFIX + modelId)])
    )
  });
}

function buildAnthropicProvider(): Provider | null {
  if (!env.ANTHROPIC_API_KEY) {
    return null;
  }
  const p = env.ANTHROPIC_BASE_URL
    ? createAnthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL })
    : anthropic;
  return p as Provider;
}

function buildModelRegistry() {
  const providers: Record<string, ProviderV1> = {};
  const openaiProvider = buildOpenAIProvider();
  if (openaiProvider) {
    providers.openai = openaiProvider;
  }
  const deepseekProvider = buildDeepSeekProvider();
  if (deepseekProvider) {
    providers.deepseek = deepseekProvider;
  }
  const anthropicProvider = buildAnthropicProvider();
  if (anthropicProvider) {
    providers.anthropic = anthropicProvider;
  }
  return createProviderRegistry(providers, { separator: ':' });
}

const modelRegistry = buildModelRegistry();

export function getModelInstance(model: string): LanguageModelV1 {
  console.log('getModelInstance', model);
  return modelRegistry.languageModel(model as never);
}
