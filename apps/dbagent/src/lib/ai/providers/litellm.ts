import { createOpenAI } from '@ai-sdk/openai';
import { LiteLLMApi, LiteLLMApiOptions, Schemas } from 'litellm-api';
import { Model, ProviderRegistry } from './types';

import { z } from 'zod';
import { createModel, createRegistryFromModels } from './utils';

const xataAgentSettingsSchema = z.object({
  // Optional internal model id. Overwrites the model id derived from the LiteLLM config
  model_id: z.string().optional(),

  // Group fallback model.
  group_fallback: z.string().optional(),

  // List of aliases this model is registered as.
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

export type LiteLLMConfig = LiteLLMApiOptions;

export async function createLiteLLMProviderRegistry(config: LiteLLMConfig): Promise<ProviderRegistry> {
  const client = new LiteLLMApi(config);
  const response = await client.api.modelManagement.modelInfoV1V1ModelInfoGet({});
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

  const litellmProxyProvider = createOpenAI({
    baseURL: config.baseUrl,
    apiKey: config.token ?? ''
  });

  const baseModels: Record<string, Model> = Object.fromEntries(
    supportedDeployments
      .sort((a, b) => {
        const nameA = a.deployment.model_name;
        const nameB = b.deployment.model_name;
        return nameA.localeCompare(nameB);
      })
      .map(({ modelId, deployment }) => {
        const model = createModel(
          {
            name: deployment.model_name,
            id: modelId,
            private: agentSettings(deployment)?.private ?? false
          },
          () => litellmProxyProvider.languageModel(deployment.model_name)
        );

        return [model.info().id, model];
      })
  );

  // Build group fallback index
  const groupFallbacks = buildModelIndex(
    baseModels,
    buildPrioritizedNameIndex(
      supportedDeployments,
      (deployment) => agentSettings(deployment)?.group_fallback,
      (deployment) => agentSettings(deployment)?.priority
    )
  );

  // Build default model index
  const aliasModels: Record<string, string> = buildPrioritizedNameIndex(
    supportedDeployments,
    (deployment) => agentSettings(deployment)?.alias,
    (deployment) => agentSettings(deployment)?.priority
  );

  const defaultModelId = 'chat';
  const defaultModel = baseModels[aliasModels[defaultModelId] ?? defaultModelId] ?? undefined;
  return createRegistryFromModels({
    models: Object.values(baseModels),
    aliases: aliasModels,
    defaultModel: defaultModel,
    fallback: (modelId) => fallbackLanguageModel(modelId, groupFallbacks)
  });
}

function fallbackLanguageModel(modelId: string, groupFallbacks: Record<string, Model>): Model | undefined {
  const [group] = modelId.split(':');
  if (group && group !== modelId) {
    const fallbackModel = groupFallbacks[group];
    if (fallbackModel) {
      return fallbackModel;
    }
  }
  return undefined;
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

function buildPrioritizedNameIndex(
  deployments: { modelId: string; deployment: Schemas.Deployment }[],
  getKey: (deployment: Schemas.Deployment) => string | string[] | undefined,
  getPriority: (deployment: Schemas.Deployment) => number | undefined = () => 1
): Record<string, string> {
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

  return Object.fromEntries(Object.entries(index).map(([key, { modelId }]) => [key, modelId]));
}

function buildModelIndex(baseModels: Record<string, Model>, index: Record<string, string>): Record<string, Model> {
  return Object.fromEntries(Object.entries(index).map(([key, modelId]) => [key, baseModels[modelId]!]));
}
