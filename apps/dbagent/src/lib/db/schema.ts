import {
  boolean,
  foreignKey,
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

export const schedule_status = pgEnum('schedule_status', ['disabled', 'scheduled', 'running']);

export const clusters = pgTable(
  'clusters',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    clusterIdentifier: text('cluster_identifier').notNull(),
    integration: text('integration').notNull(),
    data: jsonb('data').$type<RDSClusterDetailedInfo>().notNull(),
    region: text('region').default('us-east-1').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.integration],
      foreignColumns: [integrations.name],
      name: 'instances_integration_fkey'
    }),
    unique('instances_integration_identifier_unique').on(table.clusterIdentifier, table.integration)
  ]
);

export const connections = pgTable(
  'connections',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    connstring: text('connstring').notNull(),
    params: jsonb('params')
  },
  (table) => [
    unique('connections_name_unique').on(table.name),
    unique('connections_connstring_unique').on(table.connstring)
  ]
);

export const dbinfo = pgTable(
  'dbinfo',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    connectionId: uuid('connection_id'),
    module: text('module'),
    data: jsonb('data')
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'dbinfo_connid_fkey'
    }),
    unique('dbinfo_module_unique').on(table.connectionId, table.module)
  ]
);

export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name'),
    data: jsonb('data')
  },
  (table) => [unique('integrations_name_unique').on(table.name)]
);

export const assoc_cluster_connections = pgTable(
  'assoc_cluster_connections',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    clusterId: uuid('cluster_id'),
    connectionId: uuid('connection_id')
  },
  (table) => [
    foreignKey({
      columns: [table.clusterId],
      foreignColumns: [clusters.id],
      name: 'assoc_instance_connections_instance_id_fkey'
    }),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'assoc_instance_connections_connection_id_fkey'
    })
  ]
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
    enabled: boolean('enabled').notNull(),
    lastRun: timestamp('last_run', { mode: 'string' }),
    nextRun: timestamp('next_run', { mode: 'string' }),
    status: schedule_status('status').default('disabled').notNull(),
    failures: integer('failures').default(0),
    model: text('model').default('openai-gpt-4o').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'schedules_connection_id_fkey'
    })
  ]
);
