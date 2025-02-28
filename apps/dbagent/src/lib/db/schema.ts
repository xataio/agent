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

export const projectType = pgEnum('project_type', ['postgres', 'rds']);

export const scheduleStatusEnum = pgEnum('schedule_status', ['disabled', 'scheduled', 'running']);

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
    ownerId: text('owner_id').notNull(),
    type: projectType('type').notNull(),
    info: jsonb('info').$type<any>().notNull().default({})
  },
  (table) => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [users.id],
      name: 'fk_projects_owner'
    }),
    unique('uq_projects_name').on(table.ownerId, table.name)
  ]
);

export const projectConnections = pgTable(
  'project_connections',
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
      name: 'fk_project_connections_project'
    }),
    unique('uq_project_connections_name').on(table.projectId, table.name)
  ]
);

export const projectConnectionsInfo = pgTable(
  'project_connections_info',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    connectionId: uuid('connection_id'),
    type: text('type').notNull(),
    data: jsonb('data').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [projectConnections.id],
      name: 'fk_project_connections_info_conn'
    }),
    unique('uq_project_connections_info').on(table.connectionId, table.type)
  ]
);

export const projectIntegrations = pgTable(
  'project_integrations',
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
      name: 'fk_project_integrations_project'
    }),
    unique('uq_project_integrations_name').on(table.projectId, table.name)
  ]
);

export const projectSchedules = pgTable(
  'project_schedules',
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
    status: scheduleStatusEnum('status').default('disabled').notNull(),
    failures: integer('failures').default(0),
    model: text('model').default('openai-gpt-4o').notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: 'fk_project_schedules_project'
    }),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [projectConnections.id],
      name: 'fk_project_schedules_connection'
    })
  ]
);
