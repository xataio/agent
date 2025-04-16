import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

import { Model, ModelWithFallback, Provider, ProviderInfo, ProviderModel, ProviderRegistry } from './types';

type BuiltinProvider = Provider & {
  models: BuiltinProviderModel[];
};

type BuiltinProviderModel = ProviderModel & {
  providerId: string;
};

class BuiltinModel implements Model {
  #model: BuiltinProviderModel;
  #provider: ProviderInfo;

  constructor(provider: ProviderInfo, model: BuiltinProviderModel) {
    this.#model = model;
    this.#provider = provider;
  }

  info(): BuiltinProviderModel {
    return this.#model;
  }

  instance(): LanguageModel {
    const model = this.info();
    return this.#provider.kind.languageModel(model.providerId);
  }
}

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

const builtinProviderModels: Record<string, BuiltinModel> = Object.fromEntries(
  [builtinOpenAIModels, builtinDeepseekModels, builtinAnthropicModels, builtinGoogleModels].flatMap((p) => {
    return p.models.map((model) => {
      const modelInstance = new BuiltinModel(p.info, model as BuiltinProviderModel);
      return [modelInstance.info().id, modelInstance];
    });
  })
);

export const defaultLanguageModel = builtinProviderModels['openai:gpt-4.1']!;

const builtinCustomModels: Record<string, BuiltinModel> = {
  chat: defaultLanguageModel,
  title: builtinProviderModels['openai:gpt-4.1-mini']!,
  summary: builtinProviderModels['openai:gpt-4.1-mini']!
};

const builtinModels: Record<string, BuiltinModel> = {
  ...builtinProviderModels,
  ...builtinCustomModels
};

class BuiltinProviderRegistry implements ProviderRegistry {
  listLanguageModels(): Model[] {
    return Object.values(builtinProviderModels);
  }

  defaultLanguageModel(): Model {
    return defaultLanguageModel;
  }

  languageModel(id: string, useFallback?: boolean): ModelWithFallback {
    const model = builtinModels[id];
    if (!model) {
      throw new Error(`Model ${id} not found`);
    }
    return {
      ...model,
      isFallback: useFallback ?? false,
      requestedModelId: id
    } as ModelWithFallback;
  }
}

const builtinProviderRegistry = new BuiltinProviderRegistry();

export function getBuiltinProviderRegistry(): ProviderRegistry {
  return builtinProviderRegistry;
}
