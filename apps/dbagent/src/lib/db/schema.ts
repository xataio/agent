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
import { RDSClusterDetailedInfo } from '../aws/rds';

export const scheduleStatus = pgEnum('schedule_status', ['disabled', 'scheduled', 'running']);

export const awsClusters = pgTable(
  'aws_clusters',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    clusterIdentifier: text('cluster_identifier').notNull(),
    connectionId: uuid('connection_id').notNull(),
    region: text('region').default('us-east-1').notNull(),
    data: jsonb('data').$type<RDSClusterDetailedInfo>().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_aws_clusters_connection'
    }),
    unique('uq_aws_clusters_integration_identifier').on(table.clusterIdentifier)
  ]
);

export const connections = pgTable(
  'connections',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    connectionString: text('connection_string').notNull()
  },
  (table) => [
    unique('uq_connections_name').on(table.name),
    unique('uq_connections_connection_string').on(table.connectionString)
  ]
);

export const connectionInfo = pgTable(
  'connection_info',
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
    name: text('name').notNull(),
    data: jsonb('data').notNull()
  },
  (table) => [unique('uq_integrations_name').on(table.name)]
);

export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
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
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_schedules_connection'
    })
  ]
);

export const notificationLevel = pgEnum('notification_level', ['info', 'warning', 'alert']);

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
