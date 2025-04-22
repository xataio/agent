export * from './builtin';
export * from './litellm';
export * from './types';

import { env } from '~/lib/env/server';
import { getBuiltinProviderRegistry } from './builtin';
import { createLiteLLMProviderRegistry } from './litellm';
import { Model, ModelWithFallback, ProviderRegistry } from './types';
import { cached } from './utils';

const CACHE_TTL_MS = 60 * 1000; // 1 minute

function buildProviderRegistry() {
  if (env.LITELLM_BASE_URL && env.LITELLM_API_KEY) {
    return cached(
      CACHE_TTL_MS,
      async () =>
        await createLiteLLMProviderRegistry({
          baseUrl: env.LITELLM_BASE_URL!,
          token: env.LITELLM_API_KEY!
        })
    );
  }

  return () => Promise.resolve(getBuiltinProviderRegistry());
}

const providerRegistry: () => Promise<ProviderRegistry> = buildProviderRegistry();

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
