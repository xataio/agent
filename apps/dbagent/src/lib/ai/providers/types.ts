import { LanguageModel } from 'ai';

export interface ProviderRegistry {
  listLanguageModels(): Model[];
  defaultLanguageModel(): Model;
  languageModel(modelId: string): Model;
}

export interface Model {
  info(): ModelInfo;

  instance(): LanguageModel;
}

export type ModelInfo = {
  id: string;
  name: string;
};
