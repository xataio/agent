import { Ollama } from 'ollama';
import { createOllama } from 'ollama-ai-provider';
import { ProviderModel, ProviderRegistry } from './types';
import { createModel, createRegistryFromModels } from './utils';

export type OllamaConfig = {
  host?: string;
  headers?: Record<string, string>;
};

export async function createOllamaProviderRegistry(config: OllamaConfig): Promise<ProviderRegistry> {
  const client = new Ollama(config);
  const response = await client.list();

  const modelProvider = createOllama(config);

  const models = response.models.map((model) => {
    const providerModel: ProviderModel = {
      id: `ollama:${model.model}`,
      name: `Ollama - ${model.name}`
    };
    const providerId = model.model;
    return createModel(providerModel, () =>
      modelProvider.languageModel(providerId, {
        // Streaming using the ollama provider is unreliable, and not well supported by some models.
        // Unfortunately we can not tell in advance if streaming will work with the given model.
        // So we always simulate streaming to avoid issues.
        simulateStreaming: true
      })
    );
  });

  return createRegistryFromModels({ models });
}
