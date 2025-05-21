import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { env } from '~/lib/env/server';

import { Model, Provider, ProviderModel, ProviderRegistry } from './types';
import { createModel, createRegistryFromModels } from './utils';

type BuiltinProvider = Provider & {
  models: BuiltinProviderModel[];
};

type BuiltinProviderModel = ProviderModel & {
  providerId: string;
};

const builtinOpenAIModels: BuiltinProvider = {
  info: {
    name: 'OpenAI',
    id: 'openai',
    kind: openai,
    fallback: 'gpt-4o'
  },
  models: [
    {
      id: 'openai:gpt-4.1',
      providerId: 'gpt-4.1',
      name: 'GPT-4.1'
    },
    {
      id: 'openai:gpt-4.1-mini',
      providerId: 'gpt-4.1-mini',
      name: 'GPT-4.1 Mini'
    },
    {
      id: 'openai:gpt-4o',
      providerId: 'gpt-4o',
      name: 'GPT-4o'
    },
    {
      id: 'openai:gpt-4-turbo',
      providerId: 'gpt-4-turbo',
      name: 'GPT-4 Turbo'
    },
    {
      id: 'openai:o4-mini',
      providerId: 'o4-mini',
      name: 'OpenAI o4-mini'
    },
    {
      id: 'openai:o1',
      providerId: 'o1',
      name: 'OpenAI o1'
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

// We default to OpenAI GPT-4.1 if available, otherwise fallback to the first model in the list
const fallbackModel = Object.values(builtinProviderModels)[0]!;
const defaultLanguageModel = builtinProviderModels['openai:gpt-4.1'] ?? fallbackModel;
const defaultTitleModel = builtinProviderModels['openai:gpt-4.1-mini'] ?? fallbackModel;
const defaultSummaryModel = builtinProviderModels['openai:gpt-4.1-mini'] ?? fallbackModel;

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
