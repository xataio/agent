export * from './builtin';
export * from './types';

import { getBuiltinProviderRegistry } from './builtin';
import { Model, ProviderRegistry } from './types';

export function getProviderRegistry(): ProviderRegistry {
  return getBuiltinProviderRegistry();
}

export function listLanguageModels(): Model[] {
  const registry = getProviderRegistry();
  return registry.listLanguageModels();
}

export function getDefaultLanguageModel(): Model {
  const registry = getProviderRegistry();
  return registry.defaultLanguageModel();
}

export function getLanguageModel(modelId: string): Model {
  const registry = getProviderRegistry();
  return registry.languageModel(modelId);
}
