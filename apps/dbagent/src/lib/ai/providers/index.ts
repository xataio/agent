export * from './builtin';
export * from './litellm';
export * from './ollama';
export * from './types';

import { env } from '~/lib/env/server';
import { getBuiltinProviderRegistry } from './builtin';
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
    registries.push(() => Promise.resolve(getBuiltinProviderRegistry()));
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
  const hasLiteLLM = env.LITELLM_BASE_URL && env.LITELLM_API_KEY;
  const hasOllama = !!env.OLLAMA_HOST;
  const hasBuiltinKeys =
    env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || env.DEEPSEEK_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!hasLiteLLM && !hasOllama && !hasBuiltinKeys) {
    throw new Error(
      'No LLM providers configured. Set at least one of: ' +
        'OPENAI_API_KEY, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, ' +
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
