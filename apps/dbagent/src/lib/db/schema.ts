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

export const users = pgTable('users', {
  id: text('id').primaryKey().notNull(),
  email: text('email').unique().notNull(),
  name: text('name').notNull()
});

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    ownerId: text('owner_id').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: 'projects_owner_id_fkey'
    }),
    unique('projects_name_unique').on(table.name)
  ]
);

export const projectUsers = pgTable(
  'project_users',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    userId: text('user_id').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'project_users_project_id_fkey'
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'project_users_user_id_fkey'
    }),
    unique('project_users_project_user_unique').on(table.projectId, table.userId)
  ]
);

export const clusters = pgTable(
  'clusters',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    clusterIdentifier: text('cluster_identifier').notNull(),
    integration: text('integration').notNull(),
    data: jsonb('data').$type<RDSClusterDetailedInfo>().notNull(),
    region: text('region').default('us-east-1').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'clusters_project_id_fkey'
    }),
    foreignKey({
      columns: [table.integration],
      foreignColumns: [integrations.name],
      name: 'clusters_integration_fkey'
    }),
    unique('clusters_project_identifier_unique').on(table.projectId, table.clusterIdentifier)
  ]
);

export const connections = pgTable(
  'connections',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    name: text('name').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    connstring: text('connstring').notNull(),
    params: jsonb('params')
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'connections_project_id_fkey'
    }),
    unique('connections_project_name_unique').on(table.projectId, table.name)
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
    projectId: uuid('project_id').notNull(),
    name: text('name'),
    data: jsonb('data')
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'integrations_project_id_fkey'
    }),
    unique('integrations_project_name_unique').on(table.projectId, table.name)
  ]
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
    projectId: uuid('project_id').notNull(),
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
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'schedules_project_id_fkey'
    }),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'schedules_connection_id_fkey'
    })
  ]
);
