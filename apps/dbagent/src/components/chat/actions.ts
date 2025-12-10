'use server';

import {
  getDefaultLanguageModel,
  getDefaultLanguageModelForProject,
  getLanguageModel,
  listLanguageModels,
  listLanguageModelsForProject,
  Model
} from '~/lib/ai/providers';
import { getUserSessionDBAccess } from '~/lib/db/db';

export async function actionGetLanguageModels() {
  const models = await listLanguageModels();
  return models.map(getModelInfo);
}

export async function actionGetLanguageModelsForProject(projectId: string) {
  const dbAccess = await getUserSessionDBAccess();
  const models = await listLanguageModelsForProject(dbAccess, projectId);
  return models.map(getModelInfo);
}

export async function actionGetDefaultLanguageModel() {
  const model = await getDefaultLanguageModel();
  return getModelInfo(model);
}

export async function actionGetDefaultLanguageModelForProject(projectId: string) {
  const dbAccess = await getUserSessionDBAccess();
  const model = await getDefaultLanguageModelForProject(dbAccess, projectId);
  if (!model) {
    return null;
  }
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
