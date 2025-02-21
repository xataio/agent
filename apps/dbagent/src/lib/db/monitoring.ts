import { Schedule } from '~/components/monitoring/actions';
import { pool } from './db';

export async function insertSchedule(schedule: Schedule): Promise<Schedule> {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
    INSERT INTO schedules (
      connection_id,
      playbook,
      schedule_type, 
      cron_expression,
      additional_instructions,
      min_interval,
      max_interval,
      enabled
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    ) RETURNING *
  `,
      [
        schedule.connectionId,
        schedule.playbook,
        schedule.scheduleType,
        schedule.cronExpression,
        schedule.additionalInstructions,
        schedule.minInterval,
        schedule.maxInterval,
        schedule.enabled
      ]
    );

    const savedSchedule = result.rows[0];

    return {
      id: savedSchedule.id,
      connectionId: savedSchedule.connection_id,
      playbook: savedSchedule.playbook,
      scheduleType: savedSchedule.schedule_type,
      cronExpression: savedSchedule.cron_expression,
      additionalInstructions: savedSchedule.additional_instructions,
      minInterval: savedSchedule.min_interval,
      maxInterval: savedSchedule.max_interval,
      enabled: savedSchedule.enabled
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
      schedule_type = $3,
      cron_expression = $4,
      additional_instructions = $5,
      min_interval = $6,
      max_interval = $7,
      enabled = $8
    WHERE id = $9
    RETURNING *
    `,
      [
        schedule.connectionId,
        schedule.playbook,
        schedule.scheduleType,
        schedule.cronExpression,
        schedule.additionalInstructions,
        schedule.minInterval,
        schedule.maxInterval,
        schedule.enabled,
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
      scheduleType: savedSchedule.schedule_type,
      cronExpression: savedSchedule.cron_expression,
      additionalInstructions: savedSchedule.additional_instructions,
      minInterval: savedSchedule.min_interval,
      maxInterval: savedSchedule.max_interval,
      enabled: savedSchedule.enabled
    };
  } finally {
    client.release();
  }
}

export async function getSchedules(): Promise<Schedule[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM schedules');
    return result.rows.map((row) => ({
      id: row.id,
      connectionId: row.connection_id,
      playbook: row.playbook,
      scheduleType: row.schedule_type,
      cronExpression: row.cron_expression,
      additionalInstructions: row.additional_instructions,
      minInterval: row.min_interval,
      maxInterval: row.max_interval,
      enabled: row.enabled
    }));
  } finally {
    client.release();
  }
}

export async function getSchedule(id: string): Promise<Schedule> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM schedules WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new Error(`Schedule with id ${id} not found`);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      connectionId: row.connection_id,
      playbook: row.playbook,
      scheduleType: row.schedule_type,
      cronExpression: row.cron_expression,
      additionalInstructions: row.additional_instructions,
      minInterval: row.min_interval,
      maxInterval: row.max_interval,
      enabled: row.enabled
    };
  } finally {
    client.release();
  }
}
