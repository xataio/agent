'use server';

import { desc, eq, lt } from 'drizzle-orm';
import { DBAccess } from './db';
import { ScheduleRun, ScheduleRunInsert, scheduleRuns } from './schema';

export async function insertScheduleRunLimitHistory(
  dbAccess: DBAccess,
  scheduleRun: ScheduleRunInsert,
  keepHistory: number
): Promise<ScheduleRun> {
  return dbAccess.query(async ({ db }) => {
    // Insert the new run first
    const result = await db.insert(scheduleRuns).values(scheduleRun).returning();
    if (!result[0]) {
      throw new Error('Failed to insert schedule run');
    }
    const newRun = result[0];

    // Count total runs for this schedule
    const totalRuns = await db
      .select({ count: scheduleRuns.id })
      .from(scheduleRuns)
      .where(eq(scheduleRuns.scheduleId, scheduleRun.scheduleId));
    const count = Number(totalRuns[0]?.count) || 0;

    // If we haven't exceeded keepHistory limit yet, no need to delete anything
    if (count <= keepHistory) {
      return newRun;
    }

    // Find the last schedule to keep based on keepHistory
    const lastScheduleToKeep = await db
      .select()
      .from(scheduleRuns)
      .where(eq(scheduleRuns.scheduleId, scheduleRun.scheduleId))
      .orderBy(desc(scheduleRuns.createdAt))
      .offset(keepHistory - 1)
      .limit(1);
    const cutoffTimestamp = lastScheduleToKeep[0]?.createdAt;
    if (!cutoffTimestamp) {
      throw new Error('Failed to find cutoff timestamp');
    }

    // Delete older runs beyond the history limit
    await db.delete(scheduleRuns).where(lt(scheduleRuns.createdAt, cutoffTimestamp));
    return newRun;
  });
}

export async function insertScheduleRun(
  dbAccess: DBAccess,
  scheduleRun: Omit<ScheduleRun, 'id'>
): Promise<ScheduleRun> {
  return dbAccess.query(async ({ db }) => {
    const result = await db.insert(scheduleRuns).values(scheduleRun).returning();
    if (!result[0]) {
      throw new Error('Failed to insert schedule run');
    }
    return result[0];
  });
}

export async function getScheduleRuns(dbAccess: DBAccess, scheduleId: string): Promise<ScheduleRun[]> {
  return dbAccess.query(async ({ db }) => {
    return await db
      .select()
      .from(scheduleRuns)
      .where(eq(scheduleRuns.scheduleId, scheduleId))
      .orderBy(desc(scheduleRuns.createdAt));
  });
}

export async function getScheduleRun(dbAccess: DBAccess, runId: string): Promise<ScheduleRun> {
  return dbAccess.query(async ({ db }) => {
    const result = await db.select().from(scheduleRuns).where(eq(scheduleRuns.id, runId));
    if (!result[0]) {
      throw new Error('Schedule run not found');
    }
    return result[0];
  });
}
