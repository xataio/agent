import { LanguageModelV1 } from '@ai-sdk/provider';
import { defaultSettingsMiddleware, wrapLanguageModel } from 'ai';
import { Ollama, ShowResponse } from 'ollama';
import { createOllama, OllamaProvider } from 'ollama-ai-provider';
import { ProviderModel, ProviderRegistry } from './types';
import { createModel, createRegistryFromModels } from './utils';

export type OllamaConfig = {
  host?: string;
  headers?: Record<string, string>;
};

type OllamaModel = ShowResponse & {
  name: string;
  model: string;
};

export async function createOllamaProviderRegistry(config: OllamaConfig): Promise<ProviderRegistry> {
  const host = normalizeHost(config.host);
  const client = new Ollama({
    host: host,
    headers: config.headers
  });
  const listResponse = await client.list();

  // XXX: Remove models with missing capabilities: completion, tools
  //      The `show` methods return is currently missing the 'capabilities' field.
  const ollamaModelList = await Promise.all(
    listResponse.models.map(async (model) => {
      const details = await client.show({ model: model.model });
      return {
        model: model.model,
        name: model.name,
        ...details
      };
    })
  );

  const ollamaProvider = createOllama({
    baseURL: `${host}/api`,
    headers: config.headers
  });
  const models = ollamaModelList.map((m) => createOllamaModel(ollamaProvider, m));
  return createRegistryFromModels({ models });
}

function normalizeHost(host?: string): string {
  if (!host) {
    return 'http://localhost:11434';
  }
  const hostWithPort = host.match(/:\d+/) ? host : `${host}:11434`;
  return hostWithPort.match(/^https?:\/\//) ? hostWithPort : `http://${hostWithPort}`;
}

function createOllamaModel(provider: OllamaProvider, model: OllamaModel) {
  const contextLength =
    Object.entries(model.model_info || {}).find(([key]) => key.endsWith('context_length'))?.[1] || 4096;

  const providerModel: ProviderModel = {
    id: `ollama:${model.model}`,
    name: `Ollama - ${model.name}`
  };

  return createModel(providerModel, () => {
    const languageModel = provider.languageModel(model.model, {
      simulateStreaming: true,
      numCtx: contextLength,
      repeatLastN: -1,
      structuredOutputs: true
    });

    return wrapLanguageModel({
      model: languageModel as unknown as LanguageModelV1,
      middleware: [
        defaultSettingsMiddleware({
          settings: {
            temperature: 0.1
          }
        })
      ]
    });
  });
}
