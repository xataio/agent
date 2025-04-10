import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { LiteLLMClient, LiteLLMClientConfig } from '@internal/litellm-client';
import { LanguageModel } from 'ai';
import { Deployment } from '../../../../../../packages/litellm-client/src/generated/schemas';
import { Model, ModelInfo, ProviderRegistry } from './types';

class LiteLLMProviderRegistry implements ProviderRegistry {
  #models: Record<string, LiteLLMModel> | null = null;
  #extraModels: Record<string, LiteLLMModel> | null = null;
  #defaultLanguageModel: LiteLLMModel | null = null;

  constructor({
    models,
    extraModels,
    defaultLanguageModel
  }: {
    models: Record<string, LiteLLMModel>;
    extraModels?: Record<string, LiteLLMModel>;
    defaultLanguageModel?: LiteLLMModel;
  }) {
    this.#models = models;
    this.#extraModels = extraModels ?? {};
    this.#defaultLanguageModel = defaultLanguageModel ?? Object.values(models)[0] ?? null;
  }

  listLanguageModels(): Model[] {
    return Object.values(this.#models ?? {});
  }

  defaultLanguageModel(): Model {
    const model = this.#defaultLanguageModel;
    if (!model) {
      throw new Error('No model found');
    }
    return model;
  }

  languageModel(modelId: string): Model {
    const model = this.#models?.[modelId] ?? this.#extraModels?.[modelId];
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
    return this.#factory.createLanguageModel(this.#info.name);
  }
}

export type LiteLLMConfig = LiteLLMClientConfig;

export async function createLiteLLMProviderRegistry(config: LiteLLMConfig): Promise<ProviderRegistry> {
  const client = new LiteLLMClient(config);
  const response = await client.modelManagement.modelInfoV1V1ModelInfoGet({});

  const deployments = response.data?.filter(isSupportedModel).map((deployment) => ({
    modelId: modelIdFromDeployment(deployment),
    deployment
  }));

  const factory = new LLMLiteLanguageModelFactory(config.baseUrl, config.apiKey);

  const baseModels = Object.fromEntries(
    deployments?.map((d) => {
      const model = new LiteLLMModel(factory, {
        name: d.deployment.model_name,
        id: d.modelId,
        private: d.deployment.model_info?.xata_agent?.private
      });
      return [model.fullId(), model];
    }) ?? []
  );

  const defaultModels: Record<string, { modelId: string; priority: number }> = {};
  for (const d of deployments ?? []) {
    const defaultIds = d.deployment.model_info?.xata_agent?.default;
    if (!defaultIds?.length) continue;

    const modelId = d.modelId;
    const priority = d.deployment.model_info?.xata_agent?.default_priority ?? 1;
    for (const defaultId of defaultIds) {
      const existing = defaultModels[defaultId];
      if (!existing || priority > existing.priority) {
        defaultModels[defaultId] = { modelId, priority };
      }
    }
  }

  const extraModels = Object.fromEntries(
    Object.entries(defaultModels).map(([defaultId, { modelId }]) => [defaultId, baseModels[modelId]!])
  );

  return new LiteLLMProviderRegistry({
    models: Object.fromEntries(Object.entries(baseModels).sort(([a], [b]) => a.localeCompare(b))),
    extraModels,
    defaultLanguageModel: extraModels['chat'] ?? undefined
  });
}

function modelIdFromDeployment(deployment: Deployment) {
  return (
    deployment.model_info?.xata_agent?.model_id ||
    deployment.litellm_params?.model?.replace('/', '-') ||
    deployment.model_name
  );
}

function isSupportedModel(model: Deployment) {
  return isChatModel(model);
}

function isChatModel(model: Deployment) {
  return model.model_info?.mode ? model.model_info['mode'] === 'chat' : false;
}
