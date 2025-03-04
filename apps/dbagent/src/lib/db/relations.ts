import { relations } from 'drizzle-orm/relations';
import { awsClusters, connectionInfo, connections, scheduleRuns, schedules } from './schema';

export const connectionInfoRelations = relations(connectionInfo, ({ one }) => ({
  connection: one(connections, {
    fields: [connectionInfo.connectionId],
    references: [connections.id]
  })
}));

export const connectionsRelations = relations(connections, ({ many }) => ({
  connectionInfos: many(connectionInfo),
  awsClusters: many(awsClusters),
  schedules: many(schedules)
}));

export const awsClustersRelations = relations(awsClusters, ({ one }) => ({
  connection: one(connections, {
    fields: [awsClusters.connectionId],
    references: [connections.id]
  })
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  connection: one(connections, {
    fields: [schedules.connectionId],
    references: [connections.id]
  }),
  schedule_runs: many(scheduleRuns)
}));

export const scheduleRunsRelations = relations(scheduleRuns, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleRuns.scheduleId],
    references: [schedules.id]
  })
}));
