export * from './builtin';
export * from './litellm';
export * from './types';

import { env } from '~/lib/env/server';
import { getBuiltinProviderRegistry } from './builtin';
import { createLiteLLMProviderRegistry } from './litellm';
import { Model, ModelWithFallback, ProviderRegistry } from './types';

let cachedRegistry: ProviderRegistry | null = null;
let lastCacheTime: number | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function getProviderRegistry(): Promise<ProviderRegistry> {
  if (env.LITELLM_BASE_URL && env.LITELLM_API_KEY) {
    const now = Date.now();
    if (!cachedRegistry || !lastCacheTime || now - lastCacheTime > CACHE_TTL_MS) {
      cachedRegistry = await createLiteLLMProviderRegistry({
        baseUrl: env.LITELLM_BASE_URL,
        token: env.LITELLM_API_KEY
      });
      lastCacheTime = now;
    }
  } else if (!cachedRegistry) {
    cachedRegistry = getBuiltinProviderRegistry();
  }
  return cachedRegistry;
}

export async function listLanguageModels(): Promise<Model[]> {
  const registry = await getProviderRegistry();
  return registry.listLanguageModels().filter((model) => !model.info().private);
}

export async function getDefaultLanguageModel(): Promise<Model> {
  const registry = await getProviderRegistry();
  return registry.defaultLanguageModel();
}

export async function getLanguageModel(modelId: string): Promise<Model> {
  const registry = await getProviderRegistry();
  return registry.languageModel(modelId);
}

export async function getLanguageModelWithFallback(modelId: string): Promise<ModelWithFallback> {
  const registry = await getProviderRegistry();
  return registry.languageModel(modelId, true);
}
