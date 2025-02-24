import { pool } from './db';

import { CronExpressionParser } from 'cron-parser';

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
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
    INSERT INTO schedules (
      connection_id,
      playbook,
      model,
      schedule_type, 
      cron_expression,
      additional_instructions,
      min_interval,
      max_interval,
      enabled,
      status,
      next_run
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    ) RETURNING *
  `,
      [
        schedule.connectionId,
        schedule.playbook,
        schedule.model,
        schedule.scheduleType,
        schedule.cronExpression,
        schedule.additionalInstructions,
        schedule.minInterval,
        schedule.maxInterval,
        schedule.enabled,
        schedule.status,
        schedule.nextRun
      ]
    );

    const savedSchedule = result.rows[0];

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
  } finally {
    client.release();
  }
}

export async function updateSchedule(schedule: Schedule): Promise<Schedule> {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
    UPDATE schedules 
    SET
      connection_id = $1,
      playbook = $2,
      model = $3,
      schedule_type = $4,
      cron_expression = $5,
      additional_instructions = $6,
      min_interval = $7,
      max_interval = $8,
      enabled = $9,
      next_run = $10,
      failures = $11,
      last_run = $12,
      status = $13
    WHERE id = $14
    RETURNING *
    `,
      [
        schedule.connectionId,
        schedule.playbook,
        schedule.model,
        schedule.scheduleType,
        schedule.cronExpression,
        schedule.additionalInstructions,
        schedule.minInterval,
        schedule.maxInterval,
        schedule.enabled,
        schedule.nextRun,
        schedule.failures,
        schedule.lastRun,
        schedule.status,
        schedule.id
      ]
    );

    if (result.rows.length === 0) {
      throw new Error(`Schedule with id ${schedule.id} not found`);
    }

    const savedSchedule = result.rows[0];

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
  } finally {
    client.release();
  }
}

export async function getSchedules(): Promise<Schedule[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT id,
      connection_id,
      playbook,
      model,
      schedule_type,
      cron_expression,
      additional_instructions,
      min_interval,
      max_interval,
      enabled,
      COALESCE(to_char(next_run, 'YYYY-MM-DD HH24:MI:SSZ'), '') as next_run,
      COALESCE(to_char(last_run, 'YYYY-MM-DD HH24:MI:SSZ'), '') as last_run,
      failures,
      status FROM schedules`);
    return result.rows.map((row) => ({
      id: row.id,
      connectionId: row.connection_id,
      playbook: row.playbook,
      model: row.model,
      scheduleType: row.schedule_type,
      cronExpression: row.cron_expression,
      additionalInstructions: row.additional_instructions,
      minInterval: row.min_interval,
      maxInterval: row.max_interval,
      lastRun: row.last_run,
      nextRun: row.next_run,
      failures: row.failures,
      enabled: row.enabled,
      status: row.status
    }));
  } finally {
    client.release();
  }
}

export async function getSchedule(id: string): Promise<Schedule> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id,
             connection_id,
             playbook,
             model,
             schedule_type,
             cron_expression,
             additional_instructions,
             min_interval,
             max_interval,
             enabled,
             COALESCE(to_char(next_run, 'YYYY-MM-DD HH24:MI:SSZ'), '') as next_run,
             COALESCE(to_char(last_run, 'YYYY-MM-DD HH24:MI:SSZ'), '') as last_run,
             failures,
             status
      FROM schedules
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error(`Schedule with id ${id} not found`);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      connectionId: row.connection_id,
      playbook: row.playbook,
      model: row.model,
      scheduleType: row.schedule_type,
      cronExpression: row.cron_expression,
      additionalInstructions: row.additional_instructions,
      minInterval: row.min_interval,
      maxInterval: row.max_interval,
      enabled: row.enabled,
      nextRun: row.next_run,
      failures: row.failures,
      lastRun: row.last_run,
      status: row.status
    };
  } finally {
    client.release();
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM schedules WHERE id = $1', [id]);
  } finally {
    client.release();
  }
}

export async function incrementScheduleFailures(id: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('UPDATE schedules SET failures = failures + 1 WHERE id = $1', [id]);
  } finally {
    client.release();
  }
}

export async function setScheduleStatusRunning(id: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query('SELECT status FROM schedules WHERE id = $1 FOR UPDATE', [id]);

    if (result.rows[0]?.status === 'running') {
      throw new Error(`Schedule ${id} is already running`);
    }

    await client.query('UPDATE schedules SET status = $1 WHERE id = $2', ['running', id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateScheduleRunData(schedule: Schedule): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('UPDATE schedules SET next_run = $1, last_run = $2, status = $3, enabled = $4  WHERE id = $5', [
      schedule.nextRun || null,
      schedule.lastRun || null,
      schedule.status,
      schedule.enabled,
      schedule.id
    ]);
  } finally {
    client.release();
  }
}
