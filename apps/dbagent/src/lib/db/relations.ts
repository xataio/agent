import { relations } from 'drizzle-orm/relations';
import { assoc_cluster_connections, awsClusters, connectionInfo, connections, integrations, schedules } from './schema';

export const clustersRelations = relations(awsClusters, ({ one, many }) => ({
  integration: one(integrations, {
    fields: [awsClusters.integration],
    references: [integrations.name]
  }),
  assoc_cluster_connections: many(assoc_cluster_connections)
}));

export const integrationsRelations = relations(integrations, ({ many }) => ({
  clusters: many(awsClusters)
}));

export const dbinfoRelations = relations(connectionInfo, ({ one }) => ({
  connection: one(connections, {
    fields: [connectionInfo.connectionId],
    references: [connections.id]
  })
}));

export const connectionsRelations = relations(connections, ({ many }) => ({
  dbinfos: many(connectionInfo),
  assoc_cluster_connections: many(assoc_cluster_connections),
  schedules: many(schedules)
}));

export const assoc_cluster_connectionsRelations = relations(assoc_cluster_connections, ({ one }) => ({
  cluster: one(awsClusters, {
    fields: [assoc_cluster_connections.clusterId],
    references: [awsClusters.id]
  }),
  connection: one(connections, {
    fields: [assoc_cluster_connections.connectionId],
    references: [connections.id]
  })
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  connection: one(connections, {
    fields: [schedules.connectionId],
    references: [connections.id]
  })
}));
