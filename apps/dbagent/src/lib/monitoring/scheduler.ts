import { CronExpressionParser } from 'cron-parser';
import {
  incrementScheduleFailures,
  Schedule,
  setScheduleStatusRunning,
  updateScheduleRunData
} from '~/lib/db/schedules';
import { PartialBy } from '~/utils/types';
import { queryDb } from '../db/db';
import { schedules as schedulesSchema } from '../db/schema';
import { env } from '../env/server';
import { runSchedule } from './runner';

export function utcToLocalDate(utcString: string): Date {
  const date = new Date(utcString);
  const offset = date.getTimezoneOffset() * 60000; // Convert offset to milliseconds
  return new Date(date.getTime() - offset);
}

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

export function shouldRunSchedule(schedule: Schedule, now: Date): boolean {
  if (schedule.enabled === false || !schedule.nextRun) return false;
  const nextRun = utcToLocalDate(schedule.nextRun);

  if (schedule.status !== 'scheduled') {
    if (
      schedule.status === 'running' &&
      nextRun.getTime() + env.TIMEOUT_FOR_RUNNING_SCHEDULE_SECS * 1000 < now.getTime()
    ) {
      console.log(`Schedule ${schedule.id} is running but timeout has expired, restarting`);
      // The process might have crashed while the schedule was running.
      // We should restart it.
      return true;
    }
    return false;
  }

  return now >= nextRun;
}

export async function checkAndRunJobsAsAdmin() {
  console.log('Checking and running jobs as admin');
  try {
    const schedules = await queryDb(
      async ({ db }) => {
        return await db.select().from(schedulesSchema);
      },
      { admin: true }
    );

    const now = new Date();

    // Filter schedules that should run
    const schedulesToRun = [];
    for (const schedule of schedules) {
      if (!schedule.enabled) continue;
      const shouldRun = shouldRunSchedule(schedule, now);
      if (shouldRun) {
        schedulesToRun.push(schedule);
      }
    }

    // Take only up to MAX_PARALLEL_JOBS
    // Randomly shuffle the array and take first MAX_PARALLEL_JOBS items
    const shuffled = [...schedulesToRun].sort(() => Math.random() - 0.5);
    const schedulesToRunNow = shuffled.slice(0, env.MAX_PARALLEL_RUNS);
    if (schedulesToRun.length > env.MAX_PARALLEL_RUNS) {
      console.log(`Deferring ${schedulesToRun.length - env.MAX_PARALLEL_RUNS} jobs until next wake up`);
    }

    // Run selected jobs in parallel
    await Promise.all(schedulesToRunNow.map((schedule) => runJob(schedule, now)));
  } catch (error) {
    console.error('Error in scheduler:', error);
  }
}

async function runJob(schedule: Schedule, now: Date) {
  console.log(`Running playbook ${schedule.playbook} for schedule ${schedule.id}`);

  if (schedule.status === 'scheduled') {
    try {
      await setScheduleStatusRunning(schedule);
    } catch (error) {
      // I'm going to assume that some other worker has just picked this up
      // and will do the job
      console.error(`Someone else is running schedule ${schedule.id}:`, error);
      return;
    }
  }

  try {
    await runSchedule(schedule, now);
  } catch (error) {
    console.error(`Error running playbook ${schedule.playbook}:`, error);
    await incrementScheduleFailures(schedule);
  }

  // Schedule the next run (also in case of errors)
  schedule.status = 'scheduled';
  schedule.lastRun = now.toUTCString();
  schedule.nextRun = scheduleGetNextRun(schedule, now).toUTCString();
  await updateScheduleRunData(schedule);
  console.log(`Wrote back ${JSON.stringify(schedule)} to the DB`);
}
