import {
  getSchedules,
  incrementScheduleFailures,
  Schedule,
  scheduleGetNextRun,
  setScheduleStatusRunning,
  shouldRunSchedule,
  updateScheduleRunData
} from '~/lib/db/schedules';

const MAX_PARALLEL_JOBS = 20;

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
    const schedulesToRunNow = shuffled.slice(0, MAX_PARALLEL_JOBS);
    if (schedulesToRun.length > MAX_PARALLEL_JOBS) {
      console.log(`Deferring ${schedulesToRun.length - MAX_PARALLEL_JOBS} jobs until next wake up`);
    }

    // Run selected jobs in parallel
    await Promise.all(schedulesToRunNow.map((schedule) => runJob(schedule, now)));
  } catch (error) {
    console.error('Error in scheduler:', error);
  }
}

async function runJob(schedule: Schedule, now: Date) {
  try {
    await setScheduleStatusRunning(schedule.id);
  } catch (error) {
    // I'm going to assume that some other worker has just picked this up
    // and will do the job
    console.error(`Someone else is running schedule ${schedule.id}:`, error);
    return;
  }

  try {
    console.log(`Running playbook ${schedule.playbook} for schedule ${schedule.id}`);

    // TODO: Implement playbook execution
    //await executePlaybook(schedule.playbook, {
    //  connectionId: schedule.connectionId,
    //  additionalInstructions: schedule.additionalInstructions
    //});
    // Simulate job execution with 5 second delay
    await new Promise((resolve) => setTimeout(resolve, 5000));
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
