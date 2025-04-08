'use server';

import { getUserSessionDBAccess } from '~/lib/db/db';
import { getScheduleRun } from '~/lib/db/schedule-runs';
import { getSchedule } from '~/lib/db/schedules';

export async function actionGetScheduleRun(runId?: string) {
  if (!runId) return null;

  const db = await getUserSessionDBAccess();
  try {
    const run = await getScheduleRun(db, runId);
    const schedule = await getSchedule(db, run.scheduleId);
    return { schedule, run };
  } catch (error) {
    return null;
  }
}
