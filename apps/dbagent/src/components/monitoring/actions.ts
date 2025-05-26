'use server';

import { generateText } from 'ai';
import { auth } from '~/auth';
import { getModelInstance } from '~/lib/ai/agent';
import { getUserDBAccess, getUserSessionDBAccess } from '~/lib/db/db';
import { getLatestProblematicRun, getScheduleRuns } from '~/lib/db/schedule-runs';
import {
  deleteSchedule,
  getSchedule,
  getSchedules,
  insertSchedule,
  updateSchedule,
  updateScheduleRunData
} from '~/lib/db/schedules';
import { Schedule, ScheduleInsert, ScheduleRun, NotificationLevel } from '~/lib/db/schema';
import { scheduleGetNextRun, utcToLocalDate } from '~/lib/monitoring/scheduler';
import { listPlaybooks } from '~/lib/tools/playbooks';

export type ScheduleWithProblemDetails = Schedule & {
  lastRunProblemSummary?: string | null;
  lastRunProblemLevel?: NotificationLevel | null;
  lastRunProblemDate?: string | null;
};

export async function generateCronExpression(description: string): Promise<string> {
  const prompt = `Generate a cron expression for the following schedule description: "${description}". 
  Return strictly the cron expression, no quotes or anything else.`;

  const { text } = await generateText({
    model: await getModelInstance('title'),
    prompt: prompt,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        tags: ['internal', 'monitoring', 'cron']
      }
    }
  });

  return text.trim();
}

export async function actionCreateSchedule(schedule: Omit<ScheduleInsert, 'userId'>): Promise<Schedule> {
  const session = await auth();
  const userId = session?.user?.id ?? '';
  if (schedule.enabled) {
    schedule.status = 'scheduled';
    schedule.nextRun = scheduleGetNextRun({ ...schedule, userId }, new Date()).toISOString();
  }
  const dbAccess = await getUserSessionDBAccess();
  return insertSchedule(dbAccess, { ...schedule, userId });
}

export async function actionUpdateSchedule(schedule: Omit<Schedule, 'userId'>): Promise<Schedule> {
  const session = await auth();
  const userId = session?.user?.id ?? '';
  const dbAccess = await getUserDBAccess(userId);
  return updateSchedule(dbAccess, { ...schedule, userId });
}

export async function actionGetSchedules(): Promise<ScheduleWithProblemDetails[]> {
  const dbAccess = await getUserSessionDBAccess();
  const schedules = await getSchedules(dbAccess);
  const schedulesWithProblemDetails: ScheduleWithProblemDetails[] = [];

  for (const schedule of schedules) {
    const problematicRun = await getLatestProblematicRun(dbAccess, schedule.id);
    const scheduleWithDetails: ScheduleWithProblemDetails = { ...schedule };

    if (problematicRun) {
      scheduleWithDetails.lastRunProblemSummary = problematicRun.summary;
      scheduleWithDetails.lastRunProblemLevel = problematicRun.notificationLevel;
      scheduleWithDetails.lastRunProblemDate = problematicRun.createdAt
        ? utcToLocalDate(problematicRun.createdAt).toString()
        : null;
    }

    if (schedule.lastRun) {
      scheduleWithDetails.lastRun = utcToLocalDate(schedule.lastRun).toString();
    }
    if (schedule.nextRun) {
      scheduleWithDetails.nextRun = utcToLocalDate(schedule.nextRun).toString();
    }
    schedulesWithProblemDetails.push(scheduleWithDetails);
  }
  return schedulesWithProblemDetails;
}

export async function actionGetSchedule(id: string): Promise<Schedule> {
  const dbAccess = await getUserSessionDBAccess();
  return getSchedule(dbAccess, id);
}

export async function actionDeleteSchedule(id: string): Promise<void> {
  const dbAccess = await getUserSessionDBAccess();
  return deleteSchedule(dbAccess, id);
}

export async function actionListPlaybooks(): Promise<string[]> {
  return listPlaybooks();
}

export async function actionUpdateScheduleEnabled(scheduleId: string, enabled: boolean) {
  const dbAccess = await getUserSessionDBAccess();
  if (enabled) {
    const schedule = await getSchedule(dbAccess, scheduleId);
    schedule.enabled = true;
    schedule.status = 'scheduled';
    schedule.nextRun = scheduleGetNextRun(schedule, new Date()).toUTCString();
    console.log('nextRun', schedule.nextRun);
    await updateScheduleRunData(dbAccess, schedule);
  } else {
    const schedule = await getSchedule(dbAccess, scheduleId);
    schedule.enabled = false;
    schedule.status = 'disabled';
    schedule.nextRun = null;
    await updateScheduleRunData(dbAccess, schedule);
  }
}

export async function actionGetScheduleRuns(scheduleId: string): Promise<ScheduleRun[]> {
  const dbAccess = await getUserSessionDBAccess();
  return getScheduleRuns(dbAccess, scheduleId);
}
