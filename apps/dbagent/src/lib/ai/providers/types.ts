import { ProviderV1 } from '@ai-sdk/provider';
import { LanguageModel } from 'ai';

export interface ProviderRegistry {
  listLanguageModels(): Model[];
  defaultLanguageModel(): Model;
  languageModel(modelId: string): Model;
}

export interface Model {
  info(): ProviderModel;

  instance(): LanguageModel;
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
  providerId: string;
  name: string;
  private?: boolean;
};
