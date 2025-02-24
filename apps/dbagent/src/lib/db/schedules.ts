import { PrismaClient } from '@prisma/client';
import { CronExpressionParser } from 'cron-parser';

const prisma = new PrismaClient();

export type Schedule = {
  id: string;
  connectionId: string;
  playbook: string;
  model: string;
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

export function scheduleGetNextRun(schedule: Schedule, now: Date): Date {
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

export async function insertSchedule(schedule: Schedule): Promise<Schedule> {
  const savedSchedule = await prisma.schedules.create({
    data: {
      connection_id: schedule.connectionId,
      playbook: schedule.playbook,
      model: schedule.model,
      schedule_type: schedule.scheduleType,
      cron_expression: schedule.cronExpression,
      additional_instructions: schedule.additionalInstructions,
      min_interval: schedule.minInterval,
      max_interval: schedule.maxInterval,
      enabled: schedule.enabled,
      status: schedule.status,
      next_run: schedule.nextRun
    }
  });

  return {
    id: savedSchedule.id,
    connectionId: savedSchedule.connection_id,
    playbook: savedSchedule.playbook,
    model: savedSchedule.model,
    scheduleType: savedSchedule.schedule_type,
    cronExpression: savedSchedule.cron_expression,
    additionalInstructions: savedSchedule.additional_instructions,
    minInterval: savedSchedule.min_interval,
    maxInterval: savedSchedule.max_interval,
    enabled: savedSchedule.enabled,
    status: savedSchedule.status,
    nextRun: savedSchedule.next_run
  };
}

export async function updateSchedule(schedule: Schedule): Promise<Schedule> {
  const savedSchedule = await prisma.schedules.update({
    where: { id: schedule.id },
    data: {
      connection_id: schedule.connectionId,
      playbook: schedule.playbook,
      model: schedule.model,
      schedule_type: schedule.scheduleType,
      cron_expression: schedule.cronExpression,
      additional_instructions: schedule.additionalInstructions,
      min_interval: schedule.minInterval,
      max_interval: schedule.maxInterval,
      enabled: schedule.enabled,
      next_run: schedule.nextRun,
      failures: schedule.failures,
      last_run: schedule.lastRun,
      status: schedule.status
    }
  });

  return {
    id: savedSchedule.id,
    connectionId: savedSchedule.connection_id,
    playbook: savedSchedule.playbook,
    model: savedSchedule.model,
    scheduleType: savedSchedule.schedule_type,
    cronExpression: savedSchedule.cron_expression,
    additionalInstructions: savedSchedule.additional_instructions,
    minInterval: savedSchedule.min_interval,
    maxInterval: savedSchedule.max_interval,
    enabled: savedSchedule.enabled,
    nextRun: savedSchedule.next_run,
    failures: savedSchedule.failures,
    lastRun: savedSchedule.last_run,
    status: savedSchedule.status
  };
}

export async function getSchedules(): Promise<Schedule[]> {
  const schedules = await prisma.schedules.findMany();
  return schedules.map((schedule) => ({
    id: schedule.id,
    connectionId: schedule.connection_id,
    playbook: schedule.playbook,
    model: schedule.model,
    scheduleType: schedule.schedule_type,
    cronExpression: schedule.cron_expression,
    additionalInstructions: schedule.additional_instructions,
    minInterval: schedule.min_interval,
    maxInterval: schedule.max_interval,
    lastRun: schedule.last_run,
    nextRun: schedule.next_run,
    failures: schedule.failures,
    enabled: schedule.enabled,
    status: schedule.status
  }));
}

export async function getSchedule(id: string): Promise<Schedule> {
  const schedule = await prisma.schedules.findUnique({
    where: { id }
  });

  if (!schedule) {
    throw new Error(`Schedule with id ${id} not found`);
  }

  return {
    id: schedule.id,
    connectionId: schedule.connection_id,
    playbook: schedule.playbook,
    model: schedule.model,
    scheduleType: schedule.schedule_type,
    cronExpression: schedule.cron_expression,
    additionalInstructions: schedule.additional_instructions,
    minInterval: schedule.min_interval,
    maxInterval: schedule.max_interval,
    enabled: schedule.enabled,
    nextRun: schedule.next_run,
    failures: schedule.failures,
    lastRun: schedule.last_run,
    status: schedule.status
  };
}

export async function deleteSchedule(id: string): Promise<void> {
  await prisma.schedules.delete({
    where: { id }
  });
}

export async function incrementScheduleFailures(id: string): Promise<void> {
  await prisma.schedules.update({
    where: { id },
    data: {
      failures: {
        increment: 1
      }
    }
  });
}

export async function setScheduleStatusRunning(id: string): Promise<void> {
  const schedule = await prisma.schedules.findUnique({
    where: { id }
  });

  if (schedule?.status === 'running') {
    throw new Error(`Schedule ${id} is already running`);
  }

  await prisma.schedules.update({
    where: { id },
    data: {
      status: 'running'
    }
  });
}

export async function updateScheduleRunData(schedule: Schedule): Promise<void> {
  await prisma.schedules.update({
    where: { id: schedule.id },
    data: {
      next_run: schedule.nextRun || null,
      last_run: schedule.lastRun || null,
      status: schedule.status,
      enabled: schedule.enabled
    }
  });
}
