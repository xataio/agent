import { LanguageModel } from 'ai';
import { Model, ModelWithFallback, ProviderModel, ProviderRegistry } from './types';

type RegistryFromModelsProps<TModel extends Model> = {
  models: TModel[] | Record<string, TModel>;
  aliases?: Record<string, string>;
  id?: (model: TModel) => string;
  defaultModel?: TModel | null;
  fallback?: (modelId: string) => TModel | undefined;
};

export function createRegistryFromModels<TModel extends Model>({
  models,
  id,
  defaultModel,
  fallback,
  aliases
}: RegistryFromModelsProps<TModel>): ProviderRegistry {
  const index: Record<string, TModel> = Array.isArray(models)
    ? Object.fromEntries(models.map((m: TModel) => [id ? id(m) : m.info().id, m]))
    : models;
  const useDefault: TModel | null = defaultModel ?? (Array.isArray(models) ? models[0]! : Object.values(models)[0]!);
  const aliasModels: Record<string, TModel> = aliases
    ? Object.fromEntries(Object.entries(aliases).map(([alias, modelId]) => [alias, index[modelId]!]))
    : {};

  return {
    listLanguageModels: () => Object.values(index),
    defaultLanguageModel: () => useDefault,
    languageModel: (modelId: string, useFallback?: boolean) => {
      const withFallback = useFallback && !!fallback;

      const model = index[modelId] ?? aliasModels[modelId];
      if (!model && !withFallback) {
        throw new Error(`Model ${modelId} not found`);
      }
      if (model) {
        return reportOriginalModel(model);
      }

      const fallbackModel = fallback?.(modelId);
      if (!fallbackModel) {
        throw new Error(`Model ${modelId} not found and no fallback available`);
      }
      return reportFallbackModel(modelId, fallbackModel);
    }
  };
}

export function createModel<TProviderModel extends ProviderModel, TLanguageModel extends LanguageModel>(
  info: TProviderModel,
  instance: () => TLanguageModel
): Model {
  return {
    info: () => info,
    instance: () => instance()
  } as Model;
}

export function reportOriginalModel<TModel extends Model>(model: TModel): ModelWithFallback {
  return {
    info: () => model.info(),
    instance: () => model.instance(),
    isFallback: false,
    requestedModelId: model.info().id
  } as ModelWithFallback;
}

export function reportFallbackModel<TModel extends Model>(modelId: string, fallback: TModel): ModelWithFallback {
  return {
    info: () => fallback.info(),
    instance: () => fallback.instance(),
    isFallback: true,
    requestedModelId: modelId
  } as ModelWithFallback;
}

export function combineRegistries(registries: (ProviderRegistry | null)[]): ProviderRegistry {
  const nonNullRegistries = registries.filter((registry): registry is ProviderRegistry => registry !== null);
  if (nonNullRegistries.length === 0) {
    throw new Error('No registries found');
  }
  if (nonNullRegistries.length == 1) {
    return nonNullRegistries[0]!;
  }

  return {
    listLanguageModels: () => nonNullRegistries.flatMap((registry) => registry.listLanguageModels()),
    defaultLanguageModel: () => {
      for (const registry of nonNullRegistries) {
        try {
          return registry.defaultLanguageModel();
        } catch (error) {
          // Continue to next registry if default model not found
          continue;
        }
      }
      throw new Error('No default language model configured');
    },
    languageModel: (modelId: string, useFallback?: boolean) => {
      for (const registry of nonNullRegistries) {
        try {
          return registry.languageModel(modelId, useFallback);
        } catch (error) {
          // Continue to next registry if model not found
          continue;
        }
      }
      throw new Error(`Model ${modelId} not found`);
    }
  };
}

export function cached<T>(ttlMs: number, fn: () => Promise<T>): () => Promise<T> {
  let value: T | null = null;
  let lastUpdate: number | null = null;

  return async () => {
    const now = Date.now();
    if (lastUpdate && now - lastUpdate < ttlMs) {
      return value!;
    }

    const result = await fn();
    value = result;
    lastUpdate = now;
    return result;
  };
}

export function memoize<T>(fn: () => Promise<T>): () => Promise<T> {
  let value: T | null = null;
  return async () => {
    if (value) return value;
    value = await fn();
    return value;
  };
}
