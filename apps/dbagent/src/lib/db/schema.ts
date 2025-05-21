import { Message as SDKMessage } from '@ai-sdk/ui-utils';
import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  PgEnum,
  pgEnum,
  pgPolicy,
  pgRole,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';
import { RDSClusterDetailedInfo } from '../aws/rds';
import { CloudSQLInstanceInfo } from '../gcp/cloudsql';

export const authenticatedUser = pgRole('authenticated_user', { inherit: true });

type InferEnumType<T extends PgEnum<any>> = T extends PgEnum<infer U> ? U[number] : never;

export const scheduleStatus = pgEnum('schedule_status', ['disabled', 'scheduled', 'running']);
export type ScheduleStatus = InferEnumType<typeof scheduleStatus>;

export const notificationLevel = pgEnum('notification_level', ['info', 'warning', 'alert']);
export type NotificationLevel = InferEnumType<typeof notificationLevel>;

export const memberRole = pgEnum('member_role', ['owner', 'member']);
export type MemberRole = InferEnumType<typeof memberRole>;

export const cloudProvider = pgEnum('cloud_provider', ['aws', 'gcp', 'other']);
export type CloudProvider = InferEnumType<typeof cloudProvider>;

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
    }).onDelete('cascade'),
    unique('uq_aws_clusters_integration_identifier').on(table.clusterIdentifier),
    index('idx_aws_clusters_project_id').on(table.projectId),
    pgPolicy('aws_clusters_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = aws_clusters.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type AWSCluster = InferSelectModel<typeof awsClusters>;
export type AWSClusterInsert = InferInsertModel<typeof awsClusters>;

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
    }).onDelete('cascade'),
    unique('uq_connections_name').on(table.projectId, table.name),
    unique('uq_connections_connection_string').on(table.projectId, table.connectionString),
    index('idx_connections_project_id').on(table.projectId),
    pgPolicy('connections_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = connections.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type Connection = InferSelectModel<typeof connections>;
export type ConnectionInsert = InferInsertModel<typeof connections>;

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
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_connection_info_connection'
    }).onDelete('cascade'),
    unique('uq_connection_info').on(table.connectionId, table.type),
    index('idx_connection_info_connection_id').on(table.connectionId),
    index('idx_connection_info_project_id').on(table.projectId),
    pgPolicy('connection_info_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = connection_info.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type ConnectionInfo = InferSelectModel<typeof connectionInfo>;
export type ConnectionInfoInsert = InferInsertModel<typeof connectionInfo>;

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
    }).onDelete('cascade'),
    unique('uq_integrations_name').on(table.projectId, table.name),
    index('idx_integrations_project_id').on(table.projectId),
    pgPolicy('integrations_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = integrations.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type Integration = InferSelectModel<typeof integrations>;
export type IntegrationInsert = InferInsertModel<typeof integrations>;

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
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.clusterId],
      foreignColumns: [awsClusters.id],
      name: 'fk_aws_cluster_connections_cluster'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_aws_cluster_connections_connection'
    }).onDelete('cascade'),
    index('idx_aws_cluster_connections_cluster_id').on(table.clusterId),
    index('idx_aws_cluster_connections_connection_id').on(table.connectionId),
    index('idx_aws_cluster_connections_project_id').on(table.projectId),
    pgPolicy('aws_cluster_connections_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = aws_cluster_connections.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type AWSClusterConnection = InferSelectModel<typeof awsClusterConnections>;
export type AWSClusterConnectionInsert = InferInsertModel<typeof awsClusterConnections>;

export const gcpInstances = pgTable(
  'gcp_instances',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    instanceName: text('instance_name').notNull(),
    gcpProjectId: text('gcp_project_id').notNull(),
    data: jsonb('data').$type<CloudSQLInstanceInfo>().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_gcp_instances_project'
    }).onDelete('cascade'),
    index('idx_gcp_instances_project_id').on(table.projectId),
    unique('uq_gcp_instances_instance_name').on(table.projectId, table.gcpProjectId, table.instanceName),
    pgPolicy('gcp_instances_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = gcp_instances.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type GCPInstance = InferSelectModel<typeof gcpInstances>;
export type GCPInstanceInsert = InferInsertModel<typeof gcpInstances>;

export const gcpInstanceConnections = pgTable(
  'gcp_instance_connections',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    instanceId: uuid('instance_id').notNull(),
    connectionId: uuid('connection_id').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_gcp_instance_connections_project'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.instanceId],
      foreignColumns: [gcpInstances.id],
      name: 'fk_gcp_instance_connections_instance'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_gcp_instance_connections_connection'
    }).onDelete('cascade'),
    index('idx_gcp_instance_connections_instance_id').on(table.instanceId),
    index('idx_gcp_instance_connections_connection_id').on(table.connectionId),
    index('idx_gcp_instance_connections_project_id').on(table.projectId),
    pgPolicy('gcp_instance_connections_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = gcp_instance_connections.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type GCPInstanceConnection = InferSelectModel<typeof gcpInstanceConnections>;
export type GCPInstanceConnectionInsert = InferInsertModel<typeof gcpInstanceConnections>;

export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    userId: text('user_id').notNull(),
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
    model: text('model').notNull(),
    maxSteps: integer('max_steps'),
    notifyLevel: notificationLevel('notify_level').default('alert').notNull(),
    extraNotificationText: text('extra_notification_text')
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_schedules_project'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_schedules_connection'
    }).onDelete('cascade'),
    index('idx_schedules_project_id').on(table.projectId),
    index('idx_schedules_connection_id').on(table.connectionId),
    index('idx_schedules_status').on(table.status),
    index('idx_schedules_next_run').on(table.nextRun),
    index('idx_schedules_enabled').on(table.enabled),
    pgPolicy('schedules_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = schedules.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type Schedule = InferSelectModel<typeof schedules>;
export type ScheduleInsert = InferInsertModel<typeof schedules>;

export const scheduleRuns = pgTable(
  'schedule_runs',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    scheduleId: uuid('schedule_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    result: text('result').notNull(),
    summary: text('summary'),
    notificationLevel: notificationLevel('notification_level').default('info').notNull(),
    messages: jsonb('messages').$type<SDKMessage[]>().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_schedule_runs_project'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.scheduleId],
      foreignColumns: [schedules.id],
      name: 'fk_schedule_runs_schedule'
    }).onDelete('cascade'),
    index('idx_schedule_runs_created_at').on(table.scheduleId, table.createdAt),
    index('idx_schedule_runs_schedule_id').on(table.scheduleId),
    index('idx_schedule_runs_project_id').on(table.projectId),
    index('idx_schedule_runs_notification_level').on(table.notificationLevel),
    pgPolicy('schedule_runs_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = schedule_runs.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type ScheduleRun = InferSelectModel<typeof scheduleRuns>;
export type ScheduleRunInsert = InferInsertModel<typeof scheduleRuns>;

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    cloudProvider: cloudProvider('cloud_provider').notNull()
  },
  () => [
    pgPolicy('projects_view_policy', {
      to: authenticatedUser,
      for: 'select',
      using: sql`EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = current_setting('app.current_user', true)::TEXT
    )`
    }),
    pgPolicy('projects_create_policy', {
      to: authenticatedUser,
      for: 'insert',
      withCheck: sql`true`
    }),
    pgPolicy('projects_update_policy', {
      to: authenticatedUser,
      for: 'update',
      using: sql`EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = current_setting('app.current_user', true)::TEXT AND role = 'owner'
    )`
    }),
    pgPolicy('projects_delete_policy', {
      to: authenticatedUser,
      for: 'delete',
      using: sql`EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = current_setting('app.current_user', true)::TEXT AND role = 'owner'
    )`
    })
  ]
);

export type Project = InferSelectModel<typeof projects>;
export type ProjectInsert = InferInsertModel<typeof projects>;

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
    }).onDelete('cascade'),
    unique('uq_project_members_user_project').on(table.projectId, table.userId),
    index('idx_project_members_project_id').on(table.projectId),
    // Project members has an "allow all" policy, to avoid circular dependencies.
    // Instead, we use the project policies to control access to project members.
    pgPolicy('project_members_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`true`
    })
  ]
);

export type ProjectMember = InferSelectModel<typeof projectMembers>;
export type ProjectMemberInsert = InferInsertModel<typeof projectMembers>;

export const chats = pgTable(
  'chats',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    title: text('title').notNull(),
    model: text('model').notNull(),
    userId: text('user_id').notNull(),
    connectionId: uuid('connection_id')
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_chats_project'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [connections.id],
      name: 'fk_chats_connection'
    }).onDelete('set null'),
    index('idx_chats_project_id').on(table.projectId),
    index('idx_chats_user_id').on(table.userId),
    index('idx_chats_connection_id').on(table.connectionId),
    pgPolicy('chats_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = chats.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type Chat = InferSelectModel<typeof chats>;
export type ChatInsert = InferInsertModel<typeof chats>;

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    chatId: uuid('chat_id').notNull(),
    role: varchar('role').$type<SDKMessage['role']>().notNull(),
    parts: jsonb('parts').$type<SDKMessage['parts']>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_messages_project'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.chatId],
      foreignColumns: [chats.id],
      name: 'fk_messages_chat'
    }).onDelete('cascade'),
    index('idx_messages_project_id').on(table.projectId),
    index('idx_messages_chat_id').on(table.chatId),
    pgPolicy('messages_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = messages.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type Message = InferSelectModel<typeof messages>;
export type MessageInsert = InferInsertModel<typeof messages>;

export const messageVotes = pgTable(
  'message_votes',
  {
    projectId: uuid('project_id').notNull(),
    chatId: uuid('chat_id').notNull(),
    messageId: uuid('message_id').notNull(),
    userId: text('user_id').notNull(),
    isUpvoted: boolean('is_upvoted').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    primaryKey({ columns: [table.chatId, table.messageId, table.userId] }),
    foreignKey({
      columns: [table.chatId],
      foreignColumns: [chats.id],
      name: 'fk_votes_chat'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [messages.id],
      name: 'fk_message_votes_message'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_message_votes_project'
    }).onDelete('cascade'),
    index('idx_message_votes_chat_id').on(table.chatId),
    index('idx_message_votes_message_id').on(table.messageId),
    index('idx_message_votes_project_id').on(table.projectId),
    index('idx_message_votes_user_id').on(table.userId),
    pgPolicy('message_votes_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = message_votes.project_id AND user_id = current_setting('app.current_user', true)::TEXT
        )`
    })
  ]
);

export type MessageVote = InferSelectModel<typeof messageVotes>;
export type MessageVoteInsert = InferInsertModel<typeof messageVotes>;

export const artifactDocuments = pgTable(
  'artifact_documents',
  {
    id: uuid('id').defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('kind', { enum: ['text', 'sheet'] })
      .notNull()
      .default('text'),
    userId: text('user_id').notNull()
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_artifact_documents_project'
    }).onDelete('cascade'),
    index('idx_artifact_documents_project_id').on(table.projectId),
    index('idx_artifact_documents_user_id').on(table.userId),
    pgPolicy('artifact_documents_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = artifact_documents.project_id AND user_id = current_setting('app.current_user', true)::TEXT
        )`
    })
  ]
);

export type ArtifactDocument = InferSelectModel<typeof artifactDocuments>;
export type ArtifactDocumentInsert = InferInsertModel<typeof artifactDocuments>;

export const artifactSuggestions = pgTable(
  'artifact_suggestions',
  {
    id: uuid('id').defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    documentId: uuid('document_id').notNull(),
    documentCreatedAt: timestamp('document_created_at').notNull(),
    originalText: text('original_text').notNull(),
    suggestedText: text('suggested_text').notNull(),
    description: text('description'),
    isResolved: boolean('is_resolved').default(false).notNull(),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_artifact_suggestions_project'
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.documentId],
      foreignColumns: [artifactDocuments.id],
      name: 'fk_artifact_suggestions_document'
    }).onDelete('cascade'),
    index('idx_artifact_suggestions_document_id').on(table.documentId),
    index('idx_artifact_suggestions_project_id').on(table.projectId),
    index('idx_artifact_suggestions_user_id').on(table.userId),
    pgPolicy('artifact_suggestions_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = artifact_suggestions.project_id AND user_id = current_setting('app.current_user', true)::TEXT
        )`
    })
  ]
);

export type ArtifactSuggestion = InferSelectModel<typeof artifactSuggestions>;
export type ArtifactSuggestionInsert = InferInsertModel<typeof artifactSuggestions>;

export const playbooks = pgTable(
  'playbooks',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    projectId: uuid('project_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    content: jsonb('content').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    createdBy: text('created_by').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_playbooks_project'
    }).onDelete('cascade'),
    unique('uq_playbooks_name').on(table.projectId, table.name),
    index('idx_playbooks_project_id').on(table.projectId),
    pgPolicy('playbooks_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = playbooks.project_id AND user_id = current_setting('app.current_user', true)::TEXT
      )`
    })
  ]
);

export type Playbook = InferSelectModel<typeof playbooks>;
export type PlaybookInsert = InferInsertModel<typeof playbooks>;

export const mcpServers = pgTable(
  'mcp_servers',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: text('name').notNull(),
    serverName: text('server_name').notNull(),
    filePath: text('file_path').notNull(),
    version: text('version').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    envVars: jsonb('env_vars').$type<Record<string, string>>().default({}).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    unique('uq_mcp_servers_name').on(table.name),
    unique('uq_mcp_servers_server_name').on(table.serverName),
    pgPolicy('mcp_servers_policy', {
      to: authenticatedUser,
      for: 'all',
      using: sql`true`
    })
  ]
);

export type MCPServer = InferSelectModel<typeof mcpServers>;
export type MCPServerInsert = InferInsertModel<typeof mcpServers>;
