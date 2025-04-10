'use server';

import { getDefaultLanguageModel, listLanguageModels } from '~/lib/ai/providers';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getScheduleRun } from '~/lib/db/schedule-runs';
import { getSchedule } from '~/lib/db/schedules';

export async function actionGetScheduleRun(runId?: string) {
  if (!runId) return null;

  const dbAccess = await getUserSessionDBAccess();
  try {
    const run = await getScheduleRun(dbAccess, runId);
    const schedule = await getSchedule(dbAccess, run.scheduleId);
    return { schedule, run };
  } catch (error) {
    return null;
  }
}

export async function actionGetLanguageModels() {
  return (await listLanguageModels()).map((m) => {
    const { private: _, ...info } = m.info();
    return info;
  });
}

export async function actionGetDefaultLanguageModel() {
  const { private: _, ...info } = (await getDefaultLanguageModel()).info();
  return info;
}
