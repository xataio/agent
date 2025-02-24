import { CronExpressionParser } from 'cron-parser';

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
  nextRun?: string;
  failures?: number;
  status: 'disabled' | 'scheduled' | 'running';
  enabled: boolean;
};

export function shouldRunSchedule(schedule: Schedule, now: Date): boolean {
  if (schedule.enabled === false || schedule.nextRun === undefined) return false;
  return now >= new Date(schedule.nextRun);
}

export function scheduleGetNextRun(schedule: Schedule, now: Date): Date {
  if (schedule.scheduleType === 'cron' && schedule.cronExpression) {
    const interval = CronExpressionParser.parse(schedule.cronExpression);
    return interval.next().toDate();
  }
  if (schedule.scheduleType === 'automatic' && schedule.minInterval) {
    // TODO ask the model to get the interval
    const nextRun = new Date(now.getTime() + schedule.minInterval * 1000);
    return nextRun;
  }
  return now;
}
