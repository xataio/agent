import { Message } from '@ai-sdk/ui-utils';
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

export const projectType = pgEnum('project_type', ['postgres', 'rds']);
export const scheduleStatus = pgEnum('schedule_status', ['disabled', 'scheduled', 'running']);
export const notificationLevel = pgEnum('notification_level', ['info', 'warning', 'alert']);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    ownerId: text('owner_id').notNull()
  },
  (table) => [unique('uq_projects_name').on(table.ownerId, table.name)]
);

export const connections = pgTable(
  'connections',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    name: text('name').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    connectionString: text('connection_string').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_connections_project'
    }),
    unique('uq_connections_name').on(table.projectId, table.name)
  ]
);

export const connectionsInfo = pgTable(
  'connections_info',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    connectionId: uuid('connection_id').notNull(),
    type: text('type').notNull(),
    data: jsonb('data').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_connections_info_connection'
    }),
    unique('uq_connections_info').on(table.connectionId, table.type)
  ]
);

export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    name: text('name').notNull(),
    data: jsonb('data').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_integrations_project'
    }),
    unique('uq_integrations_name').on(table.projectId, table.name)
  ]
);

export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    connectionId: uuid('connection_id').notNull(),
    playbook: varchar('playbook', { length: 255 }).notNull(),
    scheduleType: varchar('schedule_type', { length: 255 }).notNull(),
    cronExpression: varchar('cron_expression', { length: 255 }),
    additionalInstructions: text('additional_instructions'),
    minInterval: integer('min_interval'),
    maxInterval: integer('max_interval'),
    enabled: boolean('enabled').default(true).notNull(),
    lastRun: timestamp('last_run', { mode: 'string' }),
    nextRun: timestamp('next_run', { mode: 'string' }),
    status: scheduleStatus('status').default('disabled').notNull(),
    failures: integer('failures').default(0),
    keepHistory: integer('keep_history').default(300).notNull(),
    model: text('model').default('openai-gpt-4o').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_schedules_project'
    }),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_schedules_connection'
    })
  ]
);

export const scheduleRuns = pgTable(
  'schedule_runs',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    scheduleId: uuid('schedule_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    result: text('result').notNull(),
    summary: text('summary'),
    notificationLevel: notificationLevel('notification_level').default('info').notNull(),
    messages: jsonb('messages').$type<Message[]>().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.scheduleId],
      foreignColumns: [schedules.id],
      name: 'fk_schedule_runs_schedule'
    }),
    index('idx_schedule_runs_created_at').on(table.scheduleId, table.createdAt)
  ]
);
