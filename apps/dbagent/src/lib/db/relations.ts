'use server';

import { relations } from 'drizzle-orm/relations';
import {
  awsClusterConnections,
  awsClusters,
  connectionInfo,
  connections,
  integrations,
  projectMembers,
  projects,
  scheduleRuns,
  schedules
} from './schema';

export const connectionsRelations = relations(connections, ({ one, many }) => ({
  project: one(projects, {
    fields: [connections.projectId],
    references: [projects.id]
  }),
  schedules: many(schedules),
  awsClusterConnections: many(awsClusterConnections),
  connectionInfos: many(connectionInfo)
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  connections: many(connections),
  integrations: many(integrations),
  schedules: many(schedules),
  awsClusterConnections: many(awsClusterConnections),
  awsClusters: many(awsClusters),
  connectionInfos: many(connectionInfo),
  scheduleRuns: many(scheduleRuns),
  projectMembers: many(projectMembers)
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  project: one(projects, {
    fields: [integrations.projectId],
    references: [projects.id]
  })
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  project: one(projects, {
    fields: [schedules.projectId],
    references: [projects.id]
  }),
  connection: one(connections, {
    fields: [schedules.connectionId],
    references: [connections.id]
  }),
  scheduleRuns: many(scheduleRuns)
}));

export const awsClusterConnectionsRelations = relations(awsClusterConnections, ({ one }) => ({
  aws_cluster: one(awsClusters, {
    fields: [awsClusterConnections.clusterId],
    references: [awsClusters.id]
  }),
  connection: one(connections, {
    fields: [awsClusterConnections.connectionId],
    references: [connections.id]
  }),
  project: one(projects, {
    fields: [awsClusterConnections.projectId],
    references: [projects.id]
  })
}));

export const awsClustersRelations = relations(awsClusters, ({ one, many }) => ({
  awsClusterConnections: many(awsClusterConnections),
  project: one(projects, {
    fields: [awsClusters.projectId],
    references: [projects.id]
  })
}));

export const connectionInfoRelations = relations(connectionInfo, ({ one }) => ({
  connection: one(connections, {
    fields: [connectionInfo.connectionId],
    references: [connections.id]
  }),
  project: one(projects, {
    fields: [connectionInfo.projectId],
    references: [projects.id]
  })
}));

export const scheduleRunsRelations = relations(scheduleRuns, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleRuns.scheduleId],
    references: [schedules.id]
  }),
  project: one(projects, {
    fields: [scheduleRuns.projectId],
    references: [projects.id]
  })
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id]
  })
}));
