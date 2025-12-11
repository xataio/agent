export * from './builtin';
export * from './litellm';
export * from './ollama';
export * from './types';

import { DBAccess } from '~/lib/db/db';
import { getDefaultModel, getDisabledModelIds } from '~/lib/db/model-settings';
import { env } from '~/lib/env/server';
import {
  getBuiltinProviderRegistry,
  getBuiltinProviderRegistryAsync,
  hasBuiltinApiKeys,
  requiresDynamicModelFetching
} from './builtin';
import { createLiteLLMProviderRegistry } from './litellm';
import { createOllamaProviderRegistry } from './ollama';
import { Model, ModelWithFallback, ProviderRegistry } from './types';
import { cached, combineRegistries, memoize } from './utils';

const CACHE_TTL_MS = 60 * 1000; // 1 minute

function buildProviderRegistry() {
  const registries: (() => Promise<ProviderRegistry | null>)[] = [];

  // Will be true if we have a provider that requires to fetch updates from a remote source.
  let requiresUpdates = false;

  // Choose base registry: LiteLLM takes precedence, otherwise use builtin providers if available
  if (env.LITELLM_BASE_URL && env.LITELLM_API_KEY) {
    requiresUpdates = true;
    registries.push(
      async () =>
        await createLiteLLMProviderRegistry({
          baseUrl: env.LITELLM_BASE_URL!,
          token: env.LITELLM_API_KEY!
        })
    );
  } else {
    // Only add builtin registry if at least one builtin provider is configured
    // This allows the app to start with only Ollama (no API keys required)
    // Use async version when OPENAI_BASE_URL is set (dynamic model fetching from OpenAI-compatible endpoints)
    if (requiresDynamicModelFetching()) {
      requiresUpdates = true;
      registries.push(async () => await getBuiltinProviderRegistryAsync());
    } else {
      registries.push(() => Promise.resolve(getBuiltinProviderRegistry()));
    }
  }

  // Add optional registries.
  if (env.OLLAMA_HOST) {
    requiresUpdates = true;
    registries.push(
      async () =>
        await createOllamaProviderRegistry({
          host: env.OLLAMA_HOST,
          headers: env.OLLAMA_HEADERS
        })
    );
  }

  // Check if we have any potential providers configured
  // Note: builtin registry may return null if no API keys are set, but that's OK if Ollama is configured
  const hasLiteLLM = !!(env.LITELLM_BASE_URL && env.LITELLM_API_KEY);
  const hasOllama = !!env.OLLAMA_HOST;

  if (!hasLiteLLM && !hasOllama && !hasBuiltinApiKeys()) {
    throw new Error(
      'No LLM providers configured. Set at least one of: ' +
        'OPENAI_API_KEY, OPENAI_BASE_URL, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, ' +
        'OLLAMA_HOST, or LITELLM_BASE_URL + LITELLM_API_KEY'
    );
  }

  // Always use combineRegistries to properly handle null values from builtin registry
  const build = async (): Promise<ProviderRegistry> => {
    const buildRegistries = await Promise.all(registries.map((registry) => registry()));
    return combineRegistries(buildRegistries);
  };

  return requiresUpdates ? cached(CACHE_TTL_MS, build) : memoize(build);
}

const providerRegistry = buildProviderRegistry();

export async function getProviderRegistry(): Promise<ProviderRegistry> {
  return await providerRegistry();
}

export async function listLanguageModels(): Promise<Model[]> {
  const registry = await getProviderRegistry();
  return registry.listLanguageModels().filter((model) => !model.info().private);
}

export async function getDefaultLanguageModel(): Promise<Model> {
  const registry = await getProviderRegistry();
  const model = registry.defaultLanguageModel();
  if (!model) {
    throw new Error('No default language model configured');
  }
  return model;
}

export async function getLanguageModel(modelId: string): Promise<Model> {
  const registry = await getProviderRegistry();
  return registry.languageModel(modelId);
}

export async function getLanguageModelWithFallback(modelId: string): Promise<ModelWithFallback> {
  const registry = await getProviderRegistry();
  return registry.languageModel(modelId, true);
}

export async function listLanguageModelsForProject(dbAccess: DBAccess, projectId: string): Promise<Model[]> {
  const allModels = await listLanguageModels();
  const disabledModelIds = await getDisabledModelIds(dbAccess, projectId);

  // If no settings exist, return all models (backwards compatibility)
  if (disabledModelIds.length === 0) {
    return allModels;
  }

  return allModels.filter((model) => !disabledModelIds.includes(model.info().id));
}

export async function getDefaultLanguageModelForProject(dbAccess: DBAccess, projectId: string): Promise<Model | null> {
  const defaultSetting = await getDefaultModel(dbAccess, projectId);
  if (defaultSetting) {
    try {
      return await getLanguageModel(defaultSetting.modelId);
    } catch {
      // Model might have been removed, fall through to global default
    }
  }
  // Fallback to global default
  try {
    return await getDefaultLanguageModel();
  } catch {
    return null;
  }
}
