'use server';

import { getDefaultLanguageModel, listLanguageModels, Model } from '~/lib/ai/providers';

export async function actionGetLanguageModels() {
  return (await listLanguageModels()).map(getModelInfo);
}

export async function actionGetDefaultLanguageModel() {
  const model = await getDefaultLanguageModel();
  return getModelInfo(model);
}

function getModelInfo(model: Model): { id: string; name: string } {
  const { private: _, ...info } = model.info();
  return info;
}
