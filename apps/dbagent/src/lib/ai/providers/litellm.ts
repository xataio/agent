import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { LiteLLMClient, LiteLLMClientConfig, Schemas } from '@internal/litellm-client';
import { LanguageModel } from 'ai';
import { Model, ModelWithFallback, ProviderModel, ProviderRegistry } from './types';

import { z } from 'zod';

const xataAgentSettingsSchema = z.object({
  // Optional internal model id. Overwrites the model id derived from the LiteLLM config
  model_id: z.string().optional(),

  // Group fallback model.
  group_fallback: z.string().optional(),

  // List of aliases this model is registerd as.
  alias: z.array(z.string()).optional(),

  // Model priority. If 2 serve as fallbacks for similar model IDs (or ID
  // groups), we use the model with the highest priority.
  // Default: 1
  priority: z.number().optional(),

  // Private models can be instantiated, but they are not explicitly shown in the UI.
  // For data extraction models like 'summary' or 'title'.
  private: z.boolean().optional()
});

type XataAgentSettings = z.infer<typeof xataAgentSettingsSchema>;

function agentSettings(d: Schemas.Deployment): XataAgentSettings | undefined {
  const settings = d.model_info?.xata_agent;
  if (!settings) return undefined;

  try {
    return xataAgentSettingsSchema.parse(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid xata_agent configuration: ${error.message}`);
    }
    throw error;
  }
}

class LiteLLMProviderRegistry implements ProviderRegistry {
  #models: Record<string, LiteLLMModel> | null = null;
  #defaultLanguageModel: LiteLLMModel | null = null;
  #groupFallbacks: Record<string, LiteLLMModel> = {};

  constructor({
    models,
    defaultLanguageModel,
    groupFallbacks
  }: {
    models: Record<string, LiteLLMModel>;
    aliasModels?: Record<string, LiteLLMModel>;
    defaultLanguageModel?: LiteLLMModel;
    groupFallbacks: Record<string, LiteLLMModel>;
  }) {
    this.#models = models;
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
    const model = this.#models?.[modelId];
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
  if (!response.data) {
    throw new Error('No models found');
  }
  return createLiteLLMProviderRegistryFromDeployments(config, response.data);
}

export function createLiteLLMProviderRegistryFromDeployments(
  config: LiteLLMConfig,
  deployments: Schemas.Deployment[]
): ProviderRegistry {
  const supportedDeployments = deployments.filter(isSupportedModel).map((deployment) => ({
    modelId: modelIdFromDeployment(deployment),
    deployment
  }));

  const factory = new LLMLiteLanguageModelFactory(config.baseUrl, config.apiKey);

  const baseModels = Object.fromEntries(
    supportedDeployments
      .sort((a, b) => {
        const nameA = a.deployment.model_name;
        const nameB = b.deployment.model_name;
        return nameA.localeCompare(nameB);
      })
      .map(({ modelId, deployment }) => {
        const model = new LiteLLMModel(factory, {
          name: deployment.model_name,
          id: modelId,
          private: agentSettings(deployment)?.private ?? false
        });
        return [model.fullId(), model] as [string, LiteLLMModel];
      })
  );

  // Build group fallback index
  const groupFallbacks = buildModelIndex(
    baseModels,
    buildPriorityIndex(
      supportedDeployments,
      (deployment) => agentSettings(deployment)?.group_fallback,
      (deployment) => agentSettings(deployment)?.priority
    )
  );

  // Build default model index
  const aliasModels = buildModelIndex(
    baseModels,
    buildPriorityIndex(
      supportedDeployments,
      (deployment) => agentSettings(deployment)?.alias,
      (deployment) => agentSettings(deployment)?.priority
    )
  );

  const models = { ...baseModels, ...aliasModels };
  return new LiteLLMProviderRegistry({
    models,
    defaultLanguageModel: models['chat'] ?? undefined,
    groupFallbacks
  });
}

function modelIdFromDeployment(deployment: Schemas.Deployment) {
  return (
    agentSettings(deployment)?.model_id || deployment.litellm_params?.model?.replace('/', ':') || deployment.model_name
  );
}

function isSupportedModel(model: Schemas.Deployment) {
  return isChatModel(model);
}

function isChatModel(model: Schemas.Deployment) {
  return model.model_info?.mode ? model.model_info['mode'] === 'chat' : false;
}

function buildPriorityIndex(
  deployments: { modelId: string; deployment: Schemas.Deployment }[],
  getKey: (deployment: Schemas.Deployment) => string | string[] | undefined,
  getPriority: (deployment: Schemas.Deployment) => number | undefined = () => 1
): Record<string, { modelId: string; priority: number }> {
  const index: Record<string, { modelId: string; priority: number }> = {};

  for (const d of deployments) {
    const { modelId, deployment } = d;

    const keys = getKey(deployment);
    if (!keys) continue;

    const priority = getPriority(deployment) ?? 1;
    const keysArray = Array.isArray(keys) ? keys : [keys];

    for (const key of keysArray) {
      const existing = index[key];
      if (!existing || priority > existing.priority) {
        index[key] = { modelId: modelId, priority };
      }
    }
  }

  return index;
}

function buildModelIndex(
  baseModels: Record<string, LiteLLMModel>,
  priorityIndex: Record<string, { modelId: string; priority: number }>
): Record<string, LiteLLMModel> {
  return Object.fromEntries(Object.entries(priorityIndex).map(([key, { modelId }]) => [key, baseModels[modelId]!]));
}
