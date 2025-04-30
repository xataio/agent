import { CronExpressionParser } from 'cron-parser';
import { Schedule } from '~/lib/db/schema';
import { PartialBy } from '~/utils/types';

export function shouldRunSchedule(schedule: Schedule, now: Date): boolean {
  if (schedule.enabled === false || !schedule.nextRun) return false;
  return now >= new Date(schedule.nextRun);
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
