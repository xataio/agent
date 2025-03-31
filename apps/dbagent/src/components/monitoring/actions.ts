'use server';

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { auth } from '~/auth';
import { getUserDBAccess, getUserSessionDBAccess } from '~/lib/db/db';
import { getScheduleRuns, ScheduleRun } from '~/lib/db/schedule-runs';
import {
  deleteSchedule,
  getSchedule,
  getSchedules,
  insertSchedule,
  Schedule,
  updateSchedule,
  updateScheduleRunData
} from '~/lib/db/schedules';
import { scheduleGetNextRun, utcToLocalDate } from '~/lib/monitoring/scheduler';
import { listPlaybooks } from '~/lib/tools/playbooks';

export async function generateCronExpression(description: string): Promise<string> {
  const prompt = `Generate a cron expression for the following schedule description: "${description}". 
  Return strictly the cron expression, no quotes or anything else.`;

  const { text } = await generateText({
    model: openai('gpt-4o'),
    prompt: prompt
  });

  return text.trim();
}

export async function actionCreateSchedule(schedule: Omit<Schedule, 'id' | 'userId'>): Promise<Schedule> {
  const session = await auth();
  const userId = session?.user?.id ?? '';
  if (schedule.enabled) {
    schedule.status = 'scheduled';
    schedule.nextRun = scheduleGetNextRun({ ...schedule, userId }, new Date()).toISOString();
  }
  const db = await getUserSessionDBAccess();
  return insertSchedule(db, { ...schedule, userId });
}

export async function actionUpdateSchedule(schedule: Omit<Schedule, 'userId'>): Promise<Schedule> {
  const session = await auth();
  const userId = session?.user?.id ?? '';
  const db = await getUserDBAccess(userId);
  return updateSchedule(db, { ...schedule, userId });
}

export async function actionGetSchedules(): Promise<Schedule[]> {
  const db = await getUserSessionDBAccess();
  const schedules = await getSchedules(db);
  // Ensure last_run is serialized as string
  schedules.forEach((schedule) => {
    if (schedule.lastRun) {
      schedule.lastRun = utcToLocalDate(schedule.lastRun).toString();
    }
    if (schedule.nextRun) {
      schedule.nextRun = utcToLocalDate(schedule.nextRun).toString();
    }
  });
  return schedules;
}

export async function actionGetSchedule(id: string): Promise<Schedule> {
  const db = await getUserSessionDBAccess();
  return getSchedule(db, id);
}

export async function actionDeleteSchedule(id: string): Promise<void> {
  const db = await getUserSessionDBAccess();
  return deleteSchedule(db, id);
}

export async function actionListPlaybooks(): Promise<string[]> {
  return listPlaybooks();
}

export async function actionUpdateScheduleEnabled(scheduleId: string, enabled: boolean) {
  const db = await getUserSessionDBAccess();
  if (enabled) {
    const schedule = await getSchedule(db, scheduleId);
    schedule.enabled = true;
    schedule.status = 'scheduled';
    schedule.nextRun = scheduleGetNextRun(schedule, new Date()).toUTCString();
    console.log('nextRun', schedule.nextRun);
    await updateScheduleRunData(db, schedule);
  } else {
    const schedule = await getSchedule(db, scheduleId);
    schedule.enabled = false;
    schedule.status = 'disabled';
    schedule.nextRun = undefined;
    await updateScheduleRunData(db, schedule);
  }
}

export async function actionGetScheduleRuns(scheduleId: string): Promise<ScheduleRun[]> {
  const db = await getUserSessionDBAccess();
  return getScheduleRuns(db, scheduleId);
}
