import { CronExpressionParser } from 'cron-parser';
import { eq, sql } from 'drizzle-orm';
import { PartialBy } from '~/utils/types';
import { db } from './db';
import { schedules } from './schema';

export type Schedule = {
  id: string;
  projectId: string;
  connectionId: string;
  playbook: string;
  model: string;
  scheduleType: string;
  cronExpression?: string | null;
  additionalInstructions?: string | null;
  minInterval?: number | null;
  maxInterval?: number | null;
  lastRun?: string | null;
  nextRun?: string | null;
  failures?: number | null;
  status: 'disabled' | 'scheduled' | 'running';
  keepHistory: number;
  enabled: boolean;
};

export function scheduleGetNextRun(schedule: PartialBy<Schedule, 'id'>, now: Date): Date {
  if (schedule.scheduleType === 'cron' && schedule.cronExpression) {
    const interval = CronExpressionParser.parse(schedule.cronExpression);
    return interval.next().toDate();
  }
  if (schedule.scheduleType === 'automatic' && schedule.minInterval) {
    // TODO ask the model to get the interval, for now use the minInterval
    const nextRun = new Date(now.getTime() + schedule.minInterval * 1000);
    return nextRun;
  }
  return now;
}

export async function insertSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
  const result = await db.insert(schedules).values(schedule).returning();

  if (!result[0]) {
    throw new Error('Failed to insert schedule');
  }

  return result[0];
}

export async function updateSchedule(schedule: Schedule): Promise<Schedule> {
  const result = await db.update(schedules).set(schedule).where(eq(schedules.id, schedule.id)).returning();

  if (!result[0]) {
    throw new Error(`Schedule with id ${schedule.id} not found`);
  }

  return result[0];
}

export async function getSchedules(): Promise<Schedule[]> {
  return await db.select().from(schedules);
}

export async function getSchedule(id: string): Promise<Schedule> {
  const result = await db.select().from(schedules).where(eq(schedules.id, id));

  if (!result[0]) {
    throw new Error(`Schedule with id ${id} not found`);
  }

  return result[0];
}

export async function deleteSchedule(id: string): Promise<void> {
  await db.delete(schedules).where(eq(schedules.id, id));
}

export async function incrementScheduleFailures(id: string): Promise<void> {
  await db
    .update(schedules)
    .set({ failures: sql`${schedules.failures} + 1` })
    .where(eq(schedules.id, id));
}

export async function setScheduleStatusRunning(id: string): Promise<void> {
  await db.transaction(async (trx) => {
    const result = await trx
      .select({ status: schedules.status })
      .from(schedules)
      .for('update')
      .where(eq(schedules.id, id));

    if (result[0]?.status === 'running') {
      throw new Error(`Schedule ${id} is already running`);
    }

    await trx.update(schedules).set({ status: 'running' }).where(eq(schedules.id, id));
  });
}

export async function updateScheduleRunData(schedule: Schedule): Promise<void> {
  await db
    .update(schedules)
    .set({
      nextRun: schedule.nextRun || null,
      lastRun: schedule.lastRun || null,
      status: schedule.status,
      enabled: schedule.enabled
    })
    .where(eq(schedules.id, schedule.id));
}
