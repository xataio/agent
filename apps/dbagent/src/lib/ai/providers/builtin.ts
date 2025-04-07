import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import { ProviderV1 } from '@ai-sdk/provider';
import { LanguageModel } from 'ai';

import { Model, ModelInfo, ProviderRegistry } from './types';

class BuiltinModel implements Model {
  #info: ModelInfo;
  #provider: ProviderV1;

  constructor(provider: ProviderV1, info: ModelInfo) {
    this.#info = info;
    this.#provider = provider;
  }

  info(): ModelInfo {
    return this.#info;
  }

  createClient(): LanguageModel {
    return this.#provider.languageModel(this.#info.id);
  }
}

const BuiltinModels: Record<string, BuiltinModel> = {
  'GPT-4o': new BuiltinModel(openai, {
    id: 'openai:gpt-4o',
    name: 'GPT-4o'
  }),
  'GPT-4 Turbo': new BuiltinModel(openai, {
    id: 'openai:gpt-4-turbo',
    name: 'GPT-4 Turbo'
  }),
  'DeepSeek Chat': new BuiltinModel(deepseek, {
    id: 'deepseek:deepseek-chat',
    name: 'DeepSeek Chat'
  }),
  'Claude 3.7 Sonnet': new BuiltinModel(anthropic, {
    id: 'anthropic:claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet'
  })
};

const defaultLanguageModel = BuiltinModels['GPT-4o']!;

class BuiltinProviderRegistry implements ProviderRegistry {
  listLanguageModels(): Model[] {
    return Object.values(BuiltinModels);
  }

  defaultLanguageModel(): Model {
    return defaultLanguageModel;
  }

  languageModel(name: string): Model {
    const model = BuiltinModels[name];
    if (!model) {
      throw new Error(`Model ${name} not found`);
    }
    return model;
  }
}

const builtinProviderRegistry = new BuiltinProviderRegistry();

export function getBuiltinProviderRegistry(): ProviderRegistry {
  return builtinProviderRegistry;
}
