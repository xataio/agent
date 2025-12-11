import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '~/lib/env/server';

import { Model, Provider, ProviderModel, ProviderRegistry } from './types';
import { createModel, createRegistryFromModels } from './utils';

type BuiltinProvider = Provider & {
  models: BuiltinProviderModel[];
};

type BuiltinProviderModel = ProviderModel & {
  providerId: string;
};

// OpenAI-compatible /v1/models API response
interface OpenAIModelsResponse {
  object: 'list';
  data: Array<{
    id: string;
    object: 'model';
    created?: number;
    owned_by?: string;
  }>;
}

// Lazy-initialized OpenAI client (only created when OPENAI_API_KEY is set)
function getOpenAIClient() {
  return createOpenAI({
    baseURL: env.OPENAI_BASE_URL,
    apiKey: env.OPENAI_API_KEY
  });
}

// Default OpenAI models (used when OPENAI_BASE_URL is not set)
const defaultOpenAIModels: BuiltinProviderModel[] = [
  { id: 'openai:gpt-5', providerId: 'gpt-5', name: 'GPT-5' },
  { id: 'openai:gpt-5-turbo', providerId: 'gpt-5-turbo', name: 'GPT-5 Turbo' },
  { id: 'openai:gpt-5-mini', providerId: 'gpt-5-mini', name: 'GPT-5 Mini' },
  { id: 'openai:gpt-4o', providerId: 'gpt-4o', name: 'GPT-4o' }
];

/**
 * Fetch models from an OpenAI-compatible API endpoint.
 * Used when OPENAI_BASE_URL is set (e.g., vLLM, LM Studio, text-generation-inference).
 */
async function fetchOpenAICompatibleModels(baseUrl: string, apiKey?: string): Promise<BuiltinProviderModel[]> {
  const url = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch models from ${url}: ${response.status} ${response.statusText}`);
  }

  const data: OpenAIModelsResponse = await response.json();

  return data.data.map((model) => {
    // Extract friendly name from model ID (e.g., "meta-llama/Llama-3.1-70B-Instruct" -> "Llama 3.1 70B Instruct")
    const friendlyName = model.id.split('/').pop()?.replace(/-/g, ' ') || model.id;

    return {
      id: `openai:${model.id}`,
      providerId: model.id,
      name: friendlyName
    };
  });
}

function getBuiltinOpenAIModels(): BuiltinProvider {
  return {
    info: {
      name: 'OpenAI',
      id: 'openai',
      kind: getOpenAIClient(),
      fallback: 'gpt-5'
    },
    models: defaultOpenAIModels
  };
}

/**
 * Determines which OpenAI models to use based on configuration:
 * 1. OPENAI_API_KEY set and != "dumb" → use hardcoded OpenAI models
 * 2. OPENAI_API_KEY not set or == "dumb" + OPENAI_BASE_URL set:
 *    - OPENAI_MODEL set → use only that model
 *    - OPENAI_MODEL not set → fetch models dynamically from /v1/models
 */
async function getBuiltinOpenAIModelsAsync(): Promise<BuiltinProvider> {
  const hasRealApiKey = env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'dumb';

  let models: BuiltinProviderModel[];

  if (hasRealApiKey) {
    // Use hardcoded OpenAI models when real API key is provided
    models = defaultOpenAIModels;
  } else if (env.OPENAI_BASE_URL) {
    // OpenAI-compatible endpoint without real API key
    if (env.OPENAI_MODEL) {
      // Use explicitly specified model
      const friendlyName = env.OPENAI_MODEL.split('/').pop()?.replace(/-/g, ' ') || env.OPENAI_MODEL;
      models = [
        {
          id: `openai:${env.OPENAI_MODEL}`,
          providerId: env.OPENAI_MODEL,
          name: friendlyName
        }
      ];
    } else {
      // Fetch models dynamically from /v1/models endpoint
      models = await fetchOpenAICompatibleModels(env.OPENAI_BASE_URL, env.OPENAI_API_KEY);
    }
  } else {
    models = defaultOpenAIModels;
  }

  return {
    info: {
      name: 'OpenAI',
      id: 'openai',
      kind: getOpenAIClient(),
      fallback: models[0]?.providerId
    },
    models
  };
}

const builtinDeepseekModels: BuiltinProvider = {
  info: {
    name: 'DeepSeek',
    id: 'deepseek',
    kind: deepseek
  },
  models: [
    {
      id: 'deepseek:chat',
      providerId: 'deepseek-chat',
      name: 'DeepSeek Chat'
    }
  ]
};

const builtinAnthropicModels: BuiltinProvider = {
  info: {
    name: 'Anthropic',
    id: 'anthropic',
    kind: anthropic
  },
  models: [
    {
      id: 'anthropic:claude-sonnet-4-5',
      providerId: 'claude-sonnet-4-5',
      name: 'Claude Sonnet 4.5'
    },
    {
      id: 'anthropic:claude-opus-4-1',
      providerId: 'claude-opus-4-1',
      name: 'Claude Opus 4.1'
    }
  ]
};

const builtinGoogleModels: BuiltinProvider = {
  info: {
    name: 'Google',
    id: 'google',
    kind: google
  },
  models: [
    {
      id: 'google:gemini-2.5-pro',
      providerId: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro'
    },
    {
      id: 'google:gemini-2.5-flash',
      providerId: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash'
    },
    {
      id: 'google:gemini-2.5-flash-lite',
      providerId: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite'
    }
  ]
};

// Lazy-initialized builtin provider registry (sync version, used when OPENAI_BASE_URL is not set)
let _builtinProviderRegistry: ProviderRegistry | null | undefined;

function buildBuiltinProviderModels(): Record<string, Model> | null {
  const activeList: BuiltinProvider[] = [];

  if (env.OPENAI_API_KEY) {
    activeList.push(getBuiltinOpenAIModels());
  }
  if (env.DEEPSEEK_API_KEY) {
    activeList.push(builtinDeepseekModels);
  }
  if (env.ANTHROPIC_API_KEY) {
    activeList.push(builtinAnthropicModels);
  }
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    activeList.push(builtinGoogleModels);
  }

  // Return null if no builtin providers are configured (allows other providers like Ollama to work alone)
  if (activeList.length === 0) {
    return null;
  }

  return Object.fromEntries(
    activeList.flatMap((p) => {
      const factory = p.info.kind;
      return p.models.map((model: BuiltinProviderModel) => {
        const modelInstance = createModel(model, () => factory.languageModel(model.providerId));
        return [modelInstance.info().id, modelInstance];
      });
    })
  );
}

async function buildBuiltinProviderModelsAsync(): Promise<Record<string, Model> | null> {
  const activeList: BuiltinProvider[] = [];

  // Fetch OpenAI models asynchronously (supports dynamic model discovery for OPENAI_BASE_URL)
  if (env.OPENAI_API_KEY || env.OPENAI_BASE_URL) {
    activeList.push(await getBuiltinOpenAIModelsAsync());
  }
  if (env.DEEPSEEK_API_KEY) {
    activeList.push(builtinDeepseekModels);
  }
  if (env.ANTHROPIC_API_KEY) {
    activeList.push(builtinAnthropicModels);
  }
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    activeList.push(builtinGoogleModels);
  }

  // Return null if no builtin providers are configured (allows other providers like Ollama to work alone)
  if (activeList.length === 0) {
    return null;
  }

  return Object.fromEntries(
    activeList.flatMap((p) => {
      const factory = p.info.kind;
      return p.models.map((model: BuiltinProviderModel) => {
        const modelInstance = createModel(model, () => factory.languageModel(model.providerId));
        return [modelInstance.info().id, modelInstance];
      });
    })
  );
}

function buildRegistry(builtinProviderModels: Record<string, Model>): ProviderRegistry {
  // We default to the first OpenAI model if available, otherwise fallback to the first model in the list
  const fallbackModel = Object.values(builtinProviderModels)[0]!;
  const openaiModels = Object.entries(builtinProviderModels).filter(([id]) => id.startsWith('openai:'));
  const defaultLanguageModel = openaiModels[0]?.[1] ?? fallbackModel;

  const builtinModelAliases: Record<string, string> = {
    chat: defaultLanguageModel.info().id,
    title: defaultLanguageModel.info().id,
    summary: defaultLanguageModel.info().id
  };

  return createRegistryFromModels({
    models: builtinProviderModels,
    aliases: builtinModelAliases,
    defaultModel: defaultLanguageModel
  });
}

function buildBuiltinProviderRegistry(): ProviderRegistry | null {
  const builtinProviderModels = buildBuiltinProviderModels();

  if (!builtinProviderModels) {
    return null;
  }

  return buildRegistry(builtinProviderModels);
}

async function buildBuiltinProviderRegistryAsync(): Promise<ProviderRegistry | null> {
  const builtinProviderModels = await buildBuiltinProviderModelsAsync();

  if (!builtinProviderModels) {
    return null;
  }

  return buildRegistry(builtinProviderModels);
}

/**
 * Check if dynamic model fetching is required.
 * True when using OpenAI-compatible endpoint without real API key and without explicit model.
 */
export function requiresDynamicModelFetching(): boolean {
  const hasRealApiKey = env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'dumb';
  return !hasRealApiKey && !!env.OPENAI_BASE_URL && !env.OPENAI_MODEL;
}

/**
 * Get builtin provider registry synchronously.
 * Use this only when OPENAI_BASE_URL is not set.
 */
export function getBuiltinProviderRegistry(): ProviderRegistry | null {
  if (_builtinProviderRegistry === undefined) {
    _builtinProviderRegistry = buildBuiltinProviderRegistry();
  }
  return _builtinProviderRegistry;
}

/**
 * Get builtin provider registry asynchronously.
 * Supports dynamic model fetching from OpenAI-compatible endpoints.
 */
export async function getBuiltinProviderRegistryAsync(): Promise<ProviderRegistry | null> {
  return await buildBuiltinProviderRegistryAsync();
}

/**
 * Check if any builtin provider API keys are configured.
 * This is a lightweight check that doesn't initialize the registry.
 */
export function hasBuiltinApiKeys(): boolean {
  return !!(
    env.OPENAI_API_KEY ||
    env.OPENAI_BASE_URL ||
    env.ANTHROPIC_API_KEY ||
    env.DEEPSEEK_API_KEY ||
    env.GOOGLE_GENERATIVE_AI_API_KEY
  );
}

export function hasBuiltinProviders(): boolean {
  return getBuiltinProviderRegistry() !== null;
}
