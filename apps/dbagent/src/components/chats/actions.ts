'use server';

import { listLanguageModels } from '~/lib/ai/providers';
import { getScheduleRun } from '~/lib/db/schedule-runs';
import { getSchedule } from '~/lib/db/schedules';

export async function actionGetScheduleRun(runId?: string) {
  if (!runId) return null;

  try {
    const run = await getScheduleRun(runId);
    const schedule = await getSchedule(run.scheduleId);
    return { schedule, run };
  } catch (error) {
    return null;
  }
}

export async function actionGetLanguageModels() {
  return (await listLanguageModels()).map((m) => m.info());
}

export async function actionGetDefaultLanguageModel() {
  const models = await listLanguageModels();
  return models[0]?.info();
}
