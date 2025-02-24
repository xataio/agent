'use server';

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import {
  deleteSchedule,
  getSchedule,
  getSchedules,
  insertSchedule,
  Schedule,
  scheduleGetNextRun,
  updateSchedule,
  updateScheduleRunData
} from '~/lib/db/schedules';
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

export async function actionCreateSchedule(schedule: Schedule): Promise<Schedule> {
  if (schedule.enabled) {
    schedule.status = 'scheduled';
    schedule.nextRun = scheduleGetNextRun(schedule, new Date()).toISOString();
  }
  return insertSchedule(schedule);
}

export async function actionUpdateSchedule(schedule: Schedule): Promise<Schedule> {
  return updateSchedule(schedule);
}

export async function actionGetSchedules(): Promise<Schedule[]> {
  const schedules = await getSchedules();
  // Ensure last_run is serialized as string
  schedules.forEach((schedule) => {
    if (schedule.lastRun) {
      schedule.lastRun = schedule.lastRun.toString();
    }
    if (schedule.nextRun) {
      schedule.nextRun = schedule.nextRun.toString();
    }
  });
  return schedules;
}

export async function actionGetSchedule(id: string): Promise<Schedule> {
  return getSchedule(id);
}

export async function actionDeleteSchedule(id: string): Promise<void> {
  return deleteSchedule(id);
}

export async function actionListPlaybooks(): Promise<string[]> {
  return listPlaybooks();
}

export async function actionUpdateScheduleEnabled(scheduleId: string, enabled: boolean) {
  if (enabled) {
    const schedule = await getSchedule(scheduleId);
    schedule.enabled = true;
    schedule.status = 'scheduled';
    schedule.nextRun = scheduleGetNextRun(schedule, new Date()).toUTCString();
    console.log('nextRun', schedule.nextRun);
    await updateScheduleRunData(schedule);
  } else {
    const schedule = await getSchedule(scheduleId);
    schedule.enabled = false;
    schedule.status = 'disabled';
    schedule.nextRun = undefined;
    await updateScheduleRunData(schedule);
  }
}
