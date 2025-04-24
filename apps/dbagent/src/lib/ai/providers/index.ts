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
  const registries: (() => Promise<ProviderRegistry>)[] = [];

  // Will be true if we have a provider that requires to fetch updates from a remote source.
  let requiresUpdates = false;

  // Choose base registry. Builtin or LiteLLM is always available.
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

  if (registries.length === 0) {
    throw new Error('No provider registry configured');
  }

  const build =
    registries.length === 1
      ? registries[0]!
      : async () => {
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
