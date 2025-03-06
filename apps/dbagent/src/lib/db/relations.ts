'use server';

import { relations } from 'drizzle-orm/relations';
import {
  awsClusterConnections,
  awsClusters,
  connectionInfo,
  connections,
  integrations,
  projects,
  scheduleRuns,
  schedules
} from './schema';

export const awsClusterConnectionsRelations = relations(awsClusterConnections, ({ one }) => ({
  aws_cluster: one(awsClusters, {
    fields: [awsClusterConnections.clusterId],
    references: [awsClusters.id]
  }),
  connection: one(connections, {
    fields: [awsClusterConnections.connectionId],
    references: [connections.id]
  })
}));

export const awsClustersRelations = relations(awsClusters, ({ many }) => ({
  awsClusterConnections: many(awsClusterConnections)
}));

export const connectionsRelations = relations(connections, ({ one, many }) => ({
  awsClusterConnections: many(awsClusterConnections),
  project: one(projects, {
    fields: [connections.projectId],
    references: [projects.id]
  }),
  connectionInfos: many(connectionInfo),
  schedules: many(schedules)
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  connections: many(connections),
  integrations: many(integrations),
  schedules: many(schedules)
}));

export const connectionInfoRelations = relations(connectionInfo, ({ one }) => ({
  connection: one(connections, {
    fields: [connectionInfo.connectionId],
    references: [connections.id]
  })
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

export const scheduleRunsRelations = relations(scheduleRuns, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleRuns.scheduleId],
    references: [schedules.id]
  })
}));
