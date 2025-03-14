'use server';

import { eq, sql } from 'drizzle-orm';
import { queryDb } from './db';
import { schedules } from './schema';

export type Schedule = {
  id: string;
  projectId: string;
  userId: string;
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
  maxSteps?: number | null;
  notifyLevel: 'alert' | 'warning' | 'info';
  extraNotificationText?: string | null;
};

export async function insertSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
  return await queryDb(async ({ db }) => {
    const result = await db.insert(schedules).values(schedule).returning();
    if (!result[0]) {
      throw new Error('Failed to insert schedule');
    }
    return result[0];
  });
}

export async function updateSchedule(schedule: Schedule): Promise<Schedule> {
  return await queryDb(async ({ db }) => {
    const result = await db.update(schedules).set(schedule).where(eq(schedules.id, schedule.id)).returning();
    if (!result[0]) {
      throw new Error(`Schedule with id ${schedule.id} not found`);
    }
    return result[0];
  });
}

export async function getSchedules(): Promise<Schedule[]> {
  return await queryDb(async ({ db }) => {
    return await db.select().from(schedules);
  });
}

export async function getSchedule(id: string): Promise<Schedule> {
  return await queryDb(async ({ db }) => {
    const result = await db.select().from(schedules).where(eq(schedules.id, id));
    if (!result[0]) {
      throw new Error(`Schedule with id ${id} not found`);
    }
    return result[0];
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  return await queryDb(async ({ db }) => {
    await db.delete(schedules).where(eq(schedules.id, id));
  });
}

export async function incrementScheduleFailures(schedule: Schedule): Promise<void> {
  return await queryDb(
    async ({ db }) => {
      await db
        .update(schedules)
        .set({ failures: sql`${schedules.failures} + 1` })
        .where(eq(schedules.id, schedule.id));
    },
    {
      asUserId: schedule.userId
    }
  );
}

export async function setScheduleStatusRunning(schedule: Schedule): Promise<void> {
  return await queryDb(
    async ({ db }) => {
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
    },
    {
      asUserId: schedule.userId
    }
  );
}

export async function updateScheduleRunData(schedule: Schedule): Promise<void> {
  return await queryDb(
    async ({ db }) => {
      await db
        .update(schedules)
        .set({
          nextRun: schedule.nextRun || null,
          lastRun: schedule.lastRun || null,
          status: schedule.status,
          enabled: schedule.enabled
        })
        .where(eq(schedules.id, schedule.id));
    },
    {
      asUserId: schedule.userId
    }
  );
}
