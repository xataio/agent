import { Message } from '@ai-sdk/ui-utils';
import { desc, eq, lt } from 'drizzle-orm';
import { db } from './db';
import { schedule_runs } from './schema';

export type ScheduleRun = {
  id: string;
  scheduleId: string;
  createdAt: string;
  result: string;
  summary: string | null;
  notificationLevel: 'info' | 'warning' | 'alert';
  messages: Message[];
};

export async function insertScheduleRunLimitHistory(
  scheduleRun: Omit<ScheduleRun, 'id'>,
  keepHistory: number
): Promise<ScheduleRun> {
  // Insert the new run first
  const newRun = await insertScheduleRun(scheduleRun);

  // Count total runs for this schedule
  const totalRuns = await db
    .select({ count: schedule_runs.id })
    .from(schedule_runs)
    .where(eq(schedule_runs.scheduleId, scheduleRun.scheduleId));
  const count = Number(totalRuns[0]?.count) || 0;

  // If we haven't exceeded keepHistory limit yet, no need to delete anything
  if (count <= keepHistory) {
    return newRun;
  }

  // Find the last schedule to keep based on keepHistory
  const lastScheduleToKeep = await db
    .select()
    .from(schedule_runs)
    .where(eq(schedule_runs.scheduleId, scheduleRun.scheduleId))
    .orderBy(desc(schedule_runs.createdAt))
    .offset(keepHistory - 1)
    .limit(1);
  const cutoffTimestamp = lastScheduleToKeep[0]?.createdAt;

  if (!cutoffTimestamp) {
    throw new Error('Failed to find cutoff timestamp');
  }

  // Delete older runs beyond the history limit
  await db.delete(schedule_runs).where(lt(schedule_runs.createdAt, cutoffTimestamp));

  return newRun;
}

export async function insertScheduleRun(scheduleRun: Omit<ScheduleRun, 'id'>) {
  const result = await db.insert(schedule_runs).values(scheduleRun).returning();

  if (!result[0]) {
    throw new Error('Failed to insert schedule run');
  }

  return result[0];
}

export async function getScheduleRuns(scheduleId: string): Promise<ScheduleRun[]> {
  return await db
    .select()
    .from(schedule_runs)
    .where(eq(schedule_runs.scheduleId, scheduleId))
    .orderBy(desc(schedule_runs.createdAt));
}

export async function getScheduleRun(runId: string): Promise<ScheduleRun> {
  const result = await db.select().from(schedule_runs).where(eq(schedule_runs.id, runId));
  if (!result[0]) {
    throw new Error('Schedule run not found');
  }
  return result[0];
}
