'use server';

import { and, eq, sql } from 'drizzle-orm';
import { DBAccess } from './db';
import { Schedule, ScheduleInsert, schedules } from './schema';

export async function insertSchedule(dbAccess: DBAccess, schedule: ScheduleInsert): Promise<Schedule> {
  return await dbAccess.query(async ({ db }) => {
    const result = await db.insert(schedules).values(schedule).returning();
    if (!result[0]) {
      throw new Error('Failed to insert schedule');
    }
    return result[0];
  });
}

export async function updateSchedule(dbAccess: DBAccess, schedule: Schedule): Promise<Schedule> {
  return await dbAccess.query(async ({ db }) => {
    const result = await db.update(schedules).set(schedule).where(eq(schedules.id, schedule.id)).returning();
    if (!result[0]) {
      throw new Error(`Schedule with id ${schedule.id} not found`);
    }
    return result[0];
  });
}

export async function getSchedules(dbAccess: DBAccess): Promise<Schedule[]> {
  return await dbAccess.query(async ({ db }) => {
    return await db.select().from(schedules);
  });
}

export async function getSchedulesByProjectId(dbAccess: DBAccess, projectId: string): Promise<Schedule[]> {
  return await dbAccess.query(async ({ db }) => {
    return await db.select().from(schedules).where(eq(schedules.projectId, projectId));
  });
}

export async function getSchedule(dbAccess: DBAccess, id: string): Promise<Schedule> {
  return await dbAccess.query(async ({ db }) => {
    const result = await db.select().from(schedules).where(eq(schedules.id, id));
    if (!result[0]) {
      throw new Error(`Schedule with id ${id} not found`);
    }
    return result[0];
  });
}

//get schedules by userId and projectId used to check if customPlaybook is being used to monitor a database, inorder to notify a user before they delete it
export async function getSchedulesByUserIdAndProjectId(
  dbAccess: DBAccess,
  userId: string,
  projectId: string
): Promise<Schedule[]> {
  return await dbAccess.query(async ({ db }) => {
    return await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.userId, userId), eq(schedules.projectId, projectId)));
  });
}

export async function deleteSchedule(dbAccess: DBAccess, id: string): Promise<void> {
  return await dbAccess.query(async ({ db }) => {
    await db.delete(schedules).where(eq(schedules.id, id));
  });
}

export async function incrementScheduleFailures(dbAccess: DBAccess, schedule: Schedule): Promise<void> {
  return await dbAccess.query(async ({ db }) => {
    await db
      .update(schedules)
      .set({ failures: sql`${schedules.failures} + 1` })
      .where(eq(schedules.id, schedule.id));
  });
}

export async function setScheduleStatusRunning(dbAccess: DBAccess, schedule: Schedule): Promise<void> {
  return await dbAccess.query(async ({ db }) => {
    await db.transaction(async (trx) => {
      const result = await trx
        .select({ status: schedules.status })
        .from(schedules)
        .for('update')
        .where(eq(schedules.id, schedule.id));
      if (result[0]?.status === 'running') {
        throw new Error(`Schedule ${schedule.id} is already running`);
      }
      await trx.update(schedules).set({ status: 'running' }).where(eq(schedules.id, schedule.id));
    });
  });
}

export async function updateScheduleRunData(dbAccess: DBAccess, schedule: Schedule): Promise<void> {
  return await dbAccess.query(async ({ db }) => {
    await db
      .update(schedules)
      .set({
        nextRun: schedule.nextRun || null,
        lastRun: schedule.lastRun || null,
        status: schedule.status,
        enabled: schedule.enabled
      })
      .where(eq(schedules.id, schedule.id));
  });
}
