import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { LiteLLMClient, LiteLLMClientConfig } from '@internal/litellm-client';
import { LanguageModel } from 'ai';
import { Deployment } from '../../../../../../packages/litellm-client/src/generated/schemas';
import { Model, ModelWithFallback, ProviderModel, ProviderRegistry } from './types';

class LiteLLMProviderRegistry implements ProviderRegistry {
  #models: Record<string, LiteLLMModel> | null = null;
  #extraModels: Record<string, LiteLLMModel> | null = null;
  #defaultLanguageModel: LiteLLMModel | null = null;
  #groupFallbacks: Record<string, LiteLLMModel> = {};

  constructor({
    models,
    extraModels,
    defaultLanguageModel,
    groupFallbacks
  }: {
    models: Record<string, LiteLLMModel>;
    extraModels?: Record<string, LiteLLMModel>;
    defaultLanguageModel?: LiteLLMModel;
    groupFallbacks: Record<string, LiteLLMModel>;
  }) {
    this.#models = models;
    this.#extraModels = extraModels ?? {};
    this.#defaultLanguageModel = defaultLanguageModel ?? Object.values(models)[0] ?? null;
    this.#groupFallbacks = groupFallbacks;
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

  languageModel(modelId: string, useFallback?: boolean): ModelWithFallback {
    // Try exact match first
    const model = this.#models?.[modelId] ?? this.#extraModels?.[modelId];
    if (!model && !useFallback) {
      throw new Error(`Model ${modelId} not found`);
    }
    if (model) {
      return {
        info: () => model.info(),
        instance: () => model.instance(),
        isFallback: false,
        requestedModelId: modelId
      };
    }

    const fallbackModel = this.fallbackLanguageModel(modelId);
    if (!fallbackModel) {
      throw new Error(`Model ${modelId} not found and no fallback available`);
    }
    return {
      info: () => fallbackModel.info(),
      instance: () => fallbackModel.instance(),
      isFallback: true,
      requestedModelId: modelId
    };
  }
  
  fallbackLanguageModel(modelId: string): LiteLLMModel | undefined {
    const [group] = modelId.split(':');
    if (group && group !== modelId) {
      const fallbackModel = this.#groupFallbacks[group];
      if (fallbackModel) {
        return fallbackModel;
      }
    }
    return undefined;
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
  #info: ProviderModel;
  #factory: LLMLiteLanguageModelFactory;

  constructor(factory: LLMLiteLanguageModelFactory, info: ProviderModel) {
    this.#factory = factory;
    this.#info = info;
  }

  info(): ProviderModel {
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
  })) ?? [];

  const factory = new LLMLiteLanguageModelFactory(config.baseUrl, config.apiKey);

  const models = Object.fromEntries(
    deployments.map((d) => {
      const model = new LiteLLMModel(factory, {
        name: d.deployment.model_name,
        id: d.modelId,
        private: d.deployment.model_info?.xata_agent?.private
      });
      return [model.fullId(), model] as [string, LiteLLMModel];
    }).sort((a, b) => {
      const nameA = a[1].info().name;
      const nameB = b[1].info().name;
      return nameA.localeCompare(nameB);
    })
  );

  // Build group fallback index
  const groupFallbacks = buildModelIndex(models, buildPriorityIndex(
    deployments,
    (d) => d.model_info?.xata_agent?.group_fallback,
    (d) => d.model_info?.xata_agent?.default_priority ?? 1
  ));

  // Build default model index
  const extraModels = buildModelIndex(models, buildPriorityIndex(
    deployments,
    (d) => d.model_info?.xata_agent?.default,
    (d) => d.model_info?.xata_agent?.default_priority ?? 1
  ));

  return new LiteLLMProviderRegistry({
    models,
    extraModels,
    defaultLanguageModel: extraModels['chat'] ?? undefined,
    groupFallbacks
  });
}

function modelIdFromDeployment(deployment: Deployment) {
  return (
    deployment.model_info?.xata_agent?.model_id ||
    deployment.litellm_params?.model?.replace('/', ':') ||
    deployment.model_name
  );
}

function isSupportedModel(model: Deployment) {
  return isChatModel(model);
}

function isChatModel(model: Deployment) {
  return model.model_info?.mode ? model.model_info['mode'] === 'chat' : false;
}

function buildPriorityIndex(
  deployments: { modelId: string; deployment: Deployment }[],
  getKey: (deployment: Deployment) => string | string[] | undefined,
  getPriority: (deployment: Deployment) => number = () => 1
): Record<string, { modelId: string; priority: number }> {
  const index: Record<string, { modelId: string; priority: number }> = {};
  
  for (const d of deployments) {
    const keys = getKey(d.deployment);
    if (!keys) continue;
    
    const priority = getPriority(d.deployment);
    const keysArray = Array.isArray(keys) ? keys : [keys];
    
    for (const key of keysArray) {
      const existing = index[key];
      if (!existing || priority > existing.priority) {
        index[key] = { modelId: d.modelId, priority };
      }
    }
  }
  
  return index;
}

function buildModelIndex(
  baseModels: Record<string, LiteLLMModel>,
  priorityIndex: Record<string, { modelId: string; priority: number }>
): Record<string, LiteLLMModel> {
  return Object.fromEntries(
    Object.entries(priorityIndex).map(([key, { modelId }]) => [key, baseModels[modelId]!])
  );
}