import { Message } from '@ai-sdk/ui-utils';
import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgRole,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';
import { RDSClusterDetailedInfo } from '../aws/rds';

export const user = pgRole('user', { inherit: true });

export const scheduleStatus = pgEnum('schedule_status', ['disabled', 'scheduled', 'running']);
export const notificationLevel = pgEnum('notification_level', ['info', 'warning', 'alert']);
export const memberRole = pgEnum('member_role', ['owner', 'member']);

export const awsClusters = pgTable(
  'aws_clusters',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    clusterIdentifier: text('cluster_identifier').notNull(),
    region: text('region').default('us-east-1').notNull(),
    data: jsonb('data').$type<RDSClusterDetailedInfo>().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_aws_clusters_project'
    }),
    unique('uq_aws_clusters_integration_identifier').on(table.clusterIdentifier),
    index('idx_aws_clusters_project_id').on(table.projectId),
    pgPolicy('aws_clusters_policy', {
      to: user,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = aws_clusters.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
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
    unique('uq_connections_name').on(table.projectId, table.name),
    unique('uq_connections_connection_string').on(table.projectId, table.connectionString),
    index('idx_connections_project_id').on(table.projectId),
    pgPolicy('connections_policy', {
      to: user,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = connections.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export const connectionInfo = pgTable(
  'connection_info',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    connectionId: uuid('connection_id').notNull(),
    type: text('type').notNull(),
    data: jsonb('data').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_connection_info_project'
    }),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_connections_info_connection'
    }),
    unique('uq_connections_info').on(table.connectionId, table.type),
    index('idx_connection_info_connection_id').on(table.connectionId),
    index('idx_connection_info_project_id').on(table.projectId),
    pgPolicy('connection_info_policy', {
      to: user,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = connection_info.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
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
    unique('uq_integrations_name').on(table.projectId, table.name),
    index('idx_integrations_project_id').on(table.projectId),
    pgPolicy('integrations_policy', {
      to: user,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = integrations.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export const awsClusterConnections = pgTable(
  'aws_cluster_connections',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    clusterId: uuid('cluster_id').notNull(),
    connectionId: uuid('connection_id').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_aws_cluster_connections_project'
    }),
    foreignKey({
      columns: [table.clusterId],
      foreignColumns: [awsClusters.id],
      name: 'fk_aws_cluster_connections_cluster'
    }),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_aws_cluster_connections_connection'
    }),
    index('idx_aws_cluster_conn_cluster_id').on(table.clusterId),
    index('idx_aws_cluster_conn_connection_id').on(table.connectionId),
    index('idx_aws_cluster_conn_project_id').on(table.projectId),
    pgPolicy('aws_cluster_connections_policy', {
      to: user,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = aws_cluster_connections.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
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
    enabled: boolean('enabled').default(true).notNull(),
    lastRun: timestamp('last_run', { mode: 'string' }),
    nextRun: timestamp('next_run', { mode: 'string' }),
    status: scheduleStatus('status').default('disabled').notNull(),
    failures: integer('failures').default(0),
    keepHistory: integer('keep_history').default(300).notNull(),
    model: text('model').default('openai-gpt-4o').notNull(),
    maxSteps: integer('max_steps'),
    notifyLevel: notificationLevel('notify_level').default('alert').notNull(),
    extraNotificationText: text('extra_notification_text')
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
    }),
    index('idx_schedules_project_id').on(table.projectId),
    index('idx_schedules_connection_id').on(table.connectionId),
    index('idx_schedules_status').on(table.status),
    index('idx_schedules_next_run').on(table.nextRun),
    index('idx_schedules_enabled').on(table.enabled),
    pgPolicy('schedules_policy', {
      to: user,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = schedules.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export const scheduleRuns = pgTable(
  'schedule_runs',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    scheduleId: uuid('schedule_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    result: text('result').notNull(),
    summary: text('summary'),
    notificationLevel: notificationLevel('notification_level').default('info').notNull(),
    messages: jsonb('messages').$type<Message[]>().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_schedule_runs_project'
    }),
    foreignKey({
      columns: [table.scheduleId],
      foreignColumns: [schedules.id],
      name: 'fk_schedule_runs_schedule'
    }),
    index('idx_schedule_runs_created_at').on(table.scheduleId, table.createdAt),
    index('idx_schedule_runs_schedule_id').on(table.scheduleId),
    index('idx_schedule_runs_project_id').on(table.projectId),
    index('idx_schedule_runs_notification_level').on(table.notificationLevel),
    pgPolicy('schedule_runs_policy', {
      to: user,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = schedule_runs.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull()
  },
  () => [
    pgPolicy('projects_view_policy', {
      to: user,
      for: 'select',
      using: sql`EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = current_setting('app.current_user', true)::TEXT
    )`
    }),
    pgPolicy('projects_create_policy', {
      to: user,
      for: 'insert',
      withCheck: sql`true`
    }),
    pgPolicy('projects_update_policy', {
      to: user,
      for: 'update',
      using: sql`EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = current_setting('app.current_user', true)::TEXT AND role = 'owner'
    )`
    }),
    pgPolicy('projects_delete_policy', {
      to: user,
      for: 'delete',
      using: sql`EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = current_setting('app.current_user', true)::TEXT AND role = 'owner'
    )`
    })
  ]
);

export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    userId: text('user_id').notNull(),
    role: memberRole('role').default('member').notNull(),
    addedAt: timestamp('added_at', { mode: 'string' }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_project_members_project'
    }),
    unique('uq_project_members_user_project').on(table.projectId, table.userId),
    index('idx_project_members_project_id').on(table.projectId)
    // Project members don't have a policy, to avoid circular dependencies.
    // Instead, we use the project policies to control access to project members.
  ]
);
