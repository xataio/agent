'use server';

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getSchedule, getSchedules, insertSchedule, updateSchedule } from '~/lib/db/monitoring';
import { listPlaybooks } from '~/lib/tools/playbooks';

export type Schedule = {
  id: string;
  connectionId: string;
  playbook: string;
  scheduleType: string;
  cronExpression?: string;
  additionalInstructions?: string;
  minInterval?: number;
  maxInterval?: number;
  lastRun?: string;
  failures?: number;
  enabled: boolean;
};

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
  return insertSchedule(schedule);
}

export async function actionUpdateSchedule(schedule: Schedule): Promise<Schedule> {
  return updateSchedule(schedule);
}

export async function actionGetSchedules(): Promise<Schedule[]> {
  const schedules = await getSchedules();
  console.log(schedules);
  return schedules;
}

export async function actionGetSchedule(id: string): Promise<Schedule> {
  return getSchedule(id);
}

export async function actionListPlaybooks(): Promise<string[]> {
  return listPlaybooks();
}
