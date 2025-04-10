import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { ProviderV1 } from '@ai-sdk/provider';
import { LanguageModel } from 'ai';

import { Model, ModelInfo, ProviderRegistry } from './types';

type Provider = {
  info: ProviderInfo;
  models: ProviderModel[];
};

type ProviderInfo = {
  name: string;
  id: string;
  kind: ProviderV1;
  fallback?: string;
};

type ProviderModel = {
  id: string;
  providerId?: string;
  name: string;
};

class BuiltinModel implements Model {
  #model: ProviderModel;
  #provider: ProviderInfo;

  constructor(provider: ProviderInfo, model: ProviderModel) {
    this.#model = model;
    this.#provider = provider;
  }

  fullId(): string {
    return `${this.#provider.id}-${this.#model.id}`;
  }

  info(): ModelInfo {
    return {
      id: this.#model.providerId || this.#model.id,
      name: this.#model.name
    };
  }

  instance(): LanguageModel {
    const model = this.info();
    return this.#provider.kind.languageModel(model.id);
  }
}

const builtinOpenAIModels: Provider = {
  info: {
    name: 'OpenAI',
    id: 'openai',
    kind: openai,
    fallback: 'gpt-4o'
  },
  models: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo'
    }
  ]
};

const builtinDeepseekModels: Provider = {
  info: {
    name: 'DeepSeek',
    id: 'deepseek',
    kind: deepseek
  },
  models: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat'
    }
  ]
};

const builtinAnthropicModels: Provider = {
  info: {
    name: 'Anthropic',
    id: 'anthropic',
    kind: anthropic
  },
  models: [
    {
      id: 'claude-3-7-sonnet',
      providerId: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet'
    }
  ]
};

const builtinGoogleModels: Provider = {
  info: {
    name: 'Google',
    id: 'google',
    kind: google
  },
  models: [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash'
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash Lite'
    }
  ]
};

const builtinProviderModels: Record<string, BuiltinModel> = Object.fromEntries(
  [builtinOpenAIModels, builtinDeepseekModels, builtinAnthropicModels, builtinGoogleModels].flatMap((p) => {
    return p.models.map((model) => {
      const modelInstance = new BuiltinModel(p.info, model);
      return [modelInstance.fullId(), modelInstance];
    });
  })
);

export const defaultLanguageModel = builtinProviderModels['openai-gpt-4o']!;

const builtinCustomModels: Record<string, BuiltinModel> = {
  chat: defaultLanguageModel,
  title: defaultLanguageModel,
  summary: defaultLanguageModel
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

  languageModel(id: string): Model {
    const model = builtinModels[id];
    if (!model) {
      throw new Error(`Model ${id} not found`);
    }
    return model;
  }
}

const builtinProviderRegistry = new BuiltinProviderRegistry();

export function getBuiltinProviderRegistry(): ProviderRegistry {
  return builtinProviderRegistry;
}
