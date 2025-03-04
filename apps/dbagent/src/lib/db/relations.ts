import { relations } from 'drizzle-orm/relations';
import { awsClusterConnections, awsClusters, connectionInfo, connections, integrations, schedules } from './schema';

export const clustersRelations = relations(awsClusters, ({ many }) => ({
  awsClusterConnections: many(awsClusterConnections)
}));

export const integrationsRelations = relations(integrations, ({ many }) => ({
  clusters: many(awsClusters)
}));

export const connectionInfoRelations = relations(connectionInfo, ({ one }) => ({
  connection: one(connections, {
    fields: [connectionInfo.connectionId],
    references: [connections.id]
  })
}));

export const connectionsRelations = relations(connections, ({ many }) => ({
  connectionInfos: many(connectionInfo),
  awsClusterConnections: many(awsClusterConnections),
  schedules: many(schedules)
}));

export const awsClusterConnectionsRelations = relations(awsClusterConnections, ({ one }) => ({
  cluster: one(awsClusters, {
    fields: [awsClusterConnections.clusterId],
    references: [awsClusters.id]
  }),
  connection: one(connections, {
    fields: [awsClusterConnections.connectionId],
    references: [connections.id]
  })
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  connection: one(connections, {
    fields: [schedules.connectionId],
    references: [connections.id]
  })
}));
