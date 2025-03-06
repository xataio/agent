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
    region: text('region').default('us-east-1').notNull(),
    data: jsonb('data').$type<RDSClusterDetailedInfo>().notNull()
  },
  (table) => [unique('uq_aws_clusters_integration_identifier').on(table.clusterIdentifier)]
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
    unique('uq_connections_connection_string').on(table.projectId, table.connectionString)
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

export const awsClusterConnections = pgTable(
  'aws_cluster_connections',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    clusterId: uuid('cluster_id').notNull(),
    connectionId: uuid('connection_id').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.clusterId],
      foreignColumns: [awsClusters.id],
      name: 'fk_aws_cluster_connections_cluster'
    }),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_aws_cluster_connections_connection'
    })
  ]
);

export const notificationLevel = pgEnum('notification_level', ['info', 'warning', 'alert']);

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

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    ownerId: text('owner_id').notNull()
  },
  (table) => [unique('uq_projects_name').on(table.ownerId, table.name)]
);

export const slackUsers = pgTable(
  'slack_users',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    slackUserId: text('slack_user_id').notNull(),
    slackTeamId: text('slack_team_id').notNull(),
    email: text('email'),
    displayName: text('display_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [unique('uq_slack_users_ids').on(table.slackUserId, table.slackTeamId)]
);

export const slackConversations = pgTable(
  'slack_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    slackChannelId: text('slack_channel_id').notNull(),
    slackTeamId: text('slack_team_id').notNull(),
    projectId: uuid('project_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_slack_conversations_project'
    }),
    unique('uq_slack_conversations_ids').on(table.slackChannelId, table.slackTeamId)
  ]
);

export const slackUserProjects = pgTable(
  'slack_user_projects',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    slackUserId: uuid('slack_user_id').notNull(),
    projectId: uuid('project_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    foreignKey({
      columns: [table.slackUserId],
      foreignColumns: [slackUsers.id],
      name: 'fk_slack_user_projects_user'
    }),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_slack_user_projects_project'
    }),
    unique('uq_slack_user_projects').on(table.slackUserId, table.projectId)
  ]
);

export const slackMemory = pgTable(
  'slack_memory',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    slackUserId: uuid('slack_user_id').notNull(),
    conversationId: uuid('conversation_id').notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    foreignKey({
      columns: [table.slackUserId],
      foreignColumns: [slackUsers.id],
      name: 'fk_slack_memory_user'
    }),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [slackConversations.id],
      name: 'fk_slack_memory_conversation'
    }),
    unique('uq_slack_memory').on(table.slackUserId, table.conversationId, table.key)
  ]
);

export const slackUserLinks = pgTable(
  'slack_user_links',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    slackUserId: uuid('slack_user_id').notNull(),
    platformUserId: text('platform_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => [
    foreignKey({
      columns: [table.slackUserId],
      foreignColumns: [slackUsers.id],
      name: 'fk_slack_user_links_slack_user'
    }),
    unique('uq_slack_user_links').on(table.slackUserId, table.platformUserId)
  ]
);
