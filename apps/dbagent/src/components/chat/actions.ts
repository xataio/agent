'use server';

import { getDefaultLanguageModel, getLanguageModel, listLanguageModels } from '~/lib/ai/providers';

export async function actionGetLanguageModels() {
  return listLanguageModels().map((m) => m.info());
}

export async function actionGetDefaultLanguageModel() {
  return getDefaultLanguageModel().info();
}

export async function actionGetLanguageModel(modelId: string) {
  return getLanguageModel(modelId).info();
}
