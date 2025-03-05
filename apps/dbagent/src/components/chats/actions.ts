'use server';

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
