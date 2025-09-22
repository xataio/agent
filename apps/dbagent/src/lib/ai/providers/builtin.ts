import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { env } from '~/lib/env/server';

import { Model, Provider, ProviderModel, ProviderRegistry } from './types';
import { createModel, createRegistryFromModels } from './utils';

type BuiltinProvider = Provider & {
  models: BuiltinProviderModel[];
};

type BuiltinProviderModel = ProviderModel & {
  providerId: string;
};

function getOpenAIProvider() {
  if (env.OPENAI_API_BASE) {
    return createOpenAI({
      baseURL: env.OPENAI_API_BASE,
      apiKey: env.OPENAI_API_KEY
    });
  }
  return openai;
}

const builtinOpenAIModels: BuiltinProvider = {
  info: {
    name: 'OpenAI',
    id: 'openai',
    kind: getOpenAIProvider(),
    fallback: 'gpt-5'
  },
  models: [
    {
      id: 'openai:gpt-5',
      providerId: 'gpt-5',
      name: 'GPT-5'
    },
    {
      id: 'openai:gpt-5-turbo',
      providerId: 'gpt-5-turbo',
      name: 'GPT-5 Turbo'
    },
    {
      id: 'openai:gpt-5-mini',
      providerId: 'gpt-5-mini',
      name: 'GPT-5 Mini'
    }
  ]
};

const builtinDeepseekModels: BuiltinProvider = {
  info: {
    name: 'DeepSeek',
    id: 'deepseek',
    kind: deepseek
  },
  models: [
    {
      id: 'deepseek:chat',
      providerId: 'deepseek-chat',
      name: 'DeepSeek Chat'
    }
  ]
};

const builtinAnthropicModels: BuiltinProvider = {
  info: {
    name: 'Anthropic',
    id: 'anthropic',
    kind: anthropic
  },
  models: [
    {
      id: 'anthropic:claude-3-7-sonnet',
      providerId: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet'
    },
    {
      id: 'anthropic:claude-3-5-haiku',
      providerId: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku'
    }
  ]
};

const builtinGoogleModels: BuiltinProvider = {
  info: {
    name: 'Google',
    id: 'google',
    kind: google
  },
  models: [
    {
      id: 'google:gemini-2.5-pro',
      providerId: 'gemini-2.5-pro-preview-03-25',
      name: 'Gemini 2.5 Pro'
    },
    {
      id: 'google:gemini-2.0-flash',
      providerId: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash'
    },
    {
      id: 'google:gemini-2.0-flash-lite',
      providerId: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash Lite'
    }
  ]
};

const builtinProviderModels: Record<string, Model> = (function () {
  const activeList: BuiltinProvider[] = [];
  if (env.OPENAI_API_KEY) {
    activeList.push(builtinOpenAIModels);
  }
  if (env.DEEPSEEK_API_KEY) {
    activeList.push(builtinDeepseekModels);
  }
  if (env.ANTHROPIC_API_KEY) {
    activeList.push(builtinAnthropicModels);
  }
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    activeList.push(builtinGoogleModels);
  }

  if (activeList.length === 0) {
    throw new Error('No providers enabled. Please configure API keys');
  }
  return Object.fromEntries(
    activeList.flatMap((p) => {
      const factory = p.info.kind;
      return p.models.map((model: BuiltinProviderModel) => {
        const modelInstance = createModel(model, () => factory.languageModel(model.providerId));
        return [modelInstance.info().id, modelInstance];
      });
    })
  );
})();

// We default to OpenAI GPT-5 if available, otherwise fallback to the first model in the list
const fallbackModel = Object.values(builtinProviderModels)[0]!;
const defaultLanguageModel = builtinProviderModels['openai:gpt-5'] ?? fallbackModel;
const defaultTitleModel = builtinProviderModels['openai:gpt-5-mini'] ?? fallbackModel;
const defaultSummaryModel = builtinProviderModels['openai:gpt-5-mini'] ?? fallbackModel;

const builtinModelAliases: Record<string, string> = {
  chat: defaultLanguageModel.info().id,
  title: defaultTitleModel.info().id,
  summary: defaultSummaryModel.info().id
};

const builtinProviderRegistry = createRegistryFromModels({
  models: builtinProviderModels,
  aliases: builtinModelAliases,
  defaultModel: defaultLanguageModel
});

export function getBuiltinProviderRegistry(): ProviderRegistry {
  return builtinProviderRegistry;
}
