import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { LiteLLMClient, LiteLLMClientConfig } from '@internal/litellm-client';
import { LanguageModel } from 'ai';
import { Deployment } from '../../../../../../packages/litellm-client/src/generated/schemas';
import { Model, ModelInfo, ProviderRegistry } from './types';

class LiteLLMProviderRegistry implements ProviderRegistry {
  #models: Record<string, LiteLLMModel> | null = null;

  constructor(models: Record<string, LiteLLMModel>) {
    this.#models = models;
  }

  listLanguageModels(): Model[] {
    return Object.values(this.#models ?? {});
  }

  defaultLanguageModel(): Model {
    const model = this.#models?.[0];
    if (!model) {
      throw new Error('No model found');
    }
    return model;
  }

  languageModel(modelId: string): Model {
    const model = this.#models?.[modelId];
    if (!model) {
      throw new Error('Model not found');
    }
    return model;
  }
}

class LLMLiteLanguageModelFactory {
  #llmliteOpenAI: OpenAIProvider;

  constructor(baseURL: string, apiKey: string) {
    this.#llmliteOpenAI = createOpenAI({
      baseURL,
      apiKey
    });
  }

  createLanguageModel(modelId: string) {
    return this.#llmliteOpenAI.languageModel(modelId);
  }
}

class LiteLLMModel implements Model {
  #info: ModelInfo;
  #factory: LLMLiteLanguageModelFactory;

  constructor(factory: LLMLiteLanguageModelFactory, info: ModelInfo) {
    this.#factory = factory;
    this.#info = info;
  }

  info(): ModelInfo {
    return this.#info;
  }

  fullId(): string {
    return this.#info.id;
  }

  instance(): LanguageModel {
    return this.#factory.createLanguageModel(this.#info.id);
  }
}
export type LiteLLMConfig = LiteLLMClientConfig;

export async function createLiteLLMProviderRegistry(config: LiteLLMConfig): Promise<ProviderRegistry> {
  const client = new LiteLLMClient(config);
  const response = await client.modelManagement.modelInfoV1V1ModelInfoGet({});

  // filter supported models only.
  const deployments = response.data?.filter(isSupportedModel);
  const factory = new LLMLiteLanguageModelFactory(config.baseUrl, config.apiKey);
  const models = Object.fromEntries(
    deployments?.map((d) => {
      const model = new LiteLLMModel(factory, { name: d.model_name, id: d.model_name });
      return [d.model_name, model];
    }) ?? []
  );

  return new LiteLLMProviderRegistry(models);
}

function isSupportedModel(model: Deployment) {
  return isChatModel(model);
}

function isChatModel(model: Deployment) {
  return model.model_info?.mode ? model.model_info['mode'] === 'chat' : false;
}
