import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '~/lib/env/server';

import { Model, Provider, ProviderModel, ProviderRegistry } from './types';
import { createModel, createRegistryFromModels } from './utils';

type BuiltinProvider = Provider & {
  models: BuiltinProviderModel[];
};

type BuiltinProviderModel = ProviderModel & {
  providerId: string;
};

const openai = createOpenAI({
  baseURL: env.OPENAI_BASE_URL,
  apiKey: env.OPENAI_API_KEY
});

const builtinOpenAIModels: BuiltinProvider = {
  info: {
    name: 'OpenAI',
    id: 'openai',
    kind: openai,
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
    },
    {
      id: 'openai:gpt-4o',
      providerId: 'gpt-4o',
      name: 'GPT-4o'
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
      id: 'anthropic:claude-sonnet-4-5',
      providerId: 'claude-sonnet-4-5',
      name: 'Claude Sonnet 4.5'
    },
    {
      id: 'anthropic:claude-opus-4-1',
      providerId: 'claude-opus-4-1',
      name: 'Claude Opus 4.1'
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
      providerId: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro'
    },
    {
      id: 'google:gemini-2.5-flash',
      providerId: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash'
    },
    {
      id: 'google:gemini-2.5-flash-lite',
      providerId: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite'
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
