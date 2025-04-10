import { LanguageModel } from 'ai';

export interface ProviderRegistry {
  listLanguageModels(): Model[];
  defaultLanguageModel(): Model;
  languageModel(modelId: string): Model;
}

export interface Model {
  fullId(): string;

  model(): ModelInfo;

  instance(): LanguageModel;
}

export type ModelInfo = {
  id: string;
  name: string;
};
