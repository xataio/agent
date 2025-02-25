import { relations } from 'drizzle-orm/relations';
import { assoc_cluster_connections, clusters, connections, dbinfo, integrations, schedules } from './schema';

export const clustersRelations = relations(clusters, ({ one, many }) => ({
  integration: one(integrations, {
    fields: [clusters.integration],
    references: [integrations.name]
  }),
  assoc_cluster_connections: many(assoc_cluster_connections)
}));

export const integrationsRelations = relations(integrations, ({ many }) => ({
  clusters: many(clusters)
}));

export const dbinfoRelations = relations(dbinfo, ({ one }) => ({
  connection: one(connections, {
    fields: [dbinfo.connid],
    references: [connections.id]
  })
}));

export const connectionsRelations = relations(connections, ({ many }) => ({
  dbinfos: many(dbinfo),
  assoc_cluster_connections: many(assoc_cluster_connections),
  schedules: many(schedules)
}));

export const assoc_cluster_connectionsRelations = relations(assoc_cluster_connections, ({ one }) => ({
  cluster: one(clusters, {
    fields: [assoc_cluster_connections.clusterId],
    references: [clusters.id]
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
