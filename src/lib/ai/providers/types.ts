import { ProviderV1 } from '@ai-sdk/provider';
import { LanguageModel } from 'ai';

export interface ProviderRegistry {
  listLanguageModels(): Model[];
  defaultLanguageModel(): Model | null;
  languageModel(modelId: string, useFallback?: boolean): ModelWithFallback;
}

export interface Model {
  info(): ProviderModel;
  instance(): LanguageModel;
}

export interface ModelWithFallback extends Model {
  isFallback: boolean;
  requestedModelId: string;
}

export type Provider = {
  info: ProviderInfo;
  models: ProviderModel[];
};

export type ProviderInfo = {
  name: string;
  id: string;
  kind: ProviderV1;
  fallback?: string;
};

export type ProviderModel = {
  id: string;
  name: string;
  private?: boolean;
};
