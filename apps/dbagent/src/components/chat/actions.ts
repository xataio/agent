'use server';

import { getDefaultLanguageModel, getLanguageModel, listLanguageModels, Model } from '~/lib/ai/providers';

export async function actionGetLanguageModels() {
  const models = await listLanguageModels();
  return models.map(getModelInfo);
}

export async function actionGetDefaultLanguageModel() {
  const model = await getDefaultLanguageModel();
  return getModelInfo(model);
}

export async function actionGetLanguageModel(modelId: string) {
  const model = await getLanguageModel(modelId);
  return getModelInfo(model);
}

function getModelInfo(model: Model): { id: string; name: string } {
  const { private: _, ...info } = model.info();
  return info;
}
