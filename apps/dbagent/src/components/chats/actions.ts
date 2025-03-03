'use server';

import { getScheduleRun, ScheduleRun } from '~/lib/db/runs';
import { getSchedule, Schedule } from '~/lib/db/schedules';

export async function actionGetScheduleRun(runId: string): Promise<{ schedule: Schedule; run: ScheduleRun }> {
  const run = await getScheduleRun(runId);
  const schedule = await getSchedule(run.scheduleId);
  return { schedule, run };
}
