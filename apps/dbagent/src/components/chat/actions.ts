'use server';

import { getDefaultLanguageModel, listLanguageModels } from '~/lib/ai/providers';

export async function actionGetLanguageModels() {
  return listLanguageModels().map((m) => m.info());
}

export async function actionGetDefaultLanguageModel() {
  return getDefaultLanguageModel().info();
}
