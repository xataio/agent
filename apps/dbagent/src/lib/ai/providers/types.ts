import { LanguageModel } from 'ai';

export interface ProviderRegistry {
  listLanguageModels(): Model[];
  defaultLanguageModel(): Model;
  languageModel(modelId: string): Model;
}

export interface Model {
  info(): ModelInfo;

  createClient(): LanguageModel;
}

export type ModelInfo = {
  name: string;
  id: string;
};
