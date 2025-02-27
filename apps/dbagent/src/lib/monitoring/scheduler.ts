import {
  getSchedules,
  incrementScheduleFailures,
  Schedule,
  scheduleGetNextRun,
  setScheduleStatusRunning,
  updateScheduleRunData
} from '~/lib/db/schedules';
import { env } from '../env/server';
import { runSchedule } from './runner';

export function shouldRunSchedule(schedule: Schedule, now: Date): boolean {
  if (schedule.enabled === false || !schedule.nextRun) return false;
  const nextRun = new Date(schedule.nextRun);

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

export async function checkAndRunJobs() {
  console.log('Checking and running jobs');
  try {
    const schedules = await getSchedules();
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
      await setScheduleStatusRunning(schedule.id);
    } catch (error) {
      // I'm going to assume that some other worker has just picked this up
      // and will do the job
      console.error(`Someone else is running schedule ${schedule.id}:`, error);
      return;
    }
  }

  try {
    await runSchedule(schedule);
  } catch (error) {
    console.error(`Error running playbook ${schedule.playbook}:`, error);
    await incrementScheduleFailures(schedule.id);
  }

  // Schedule the next run (also in case of errors)
  schedule.status = 'scheduled';
  schedule.lastRun = now.toUTCString();
  schedule.nextRun = scheduleGetNextRun(schedule, now).toUTCString();
  await updateScheduleRunData(schedule);
  console.log(`Wrote back ${JSON.stringify(schedule)} to the DB`);
}
