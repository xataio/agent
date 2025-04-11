import { relations } from 'drizzle-orm/relations';
import {
  artifactDocuments,
  artifactSuggestions,
  awsClusterConnections,
  awsClusters,
  chats,
  connectionInfo,
  connections,
  gcpInstanceConnections,
  gcpInstances,
  integrations,
  messages,
  messageVotes,
  playbooks,
  projectMembers,
  projects,
  scheduleRuns,
  schedules
} from './schema';

export const gcpInstanceConnectionsRelations = relations(gcpInstanceConnections, ({ one }) => ({
  project: one(projects, {
    fields: [gcpInstanceConnections.projectId],
    references: [projects.id]
  }),
  gcpInstance: one(gcpInstances, {
    fields: [gcpInstanceConnections.instanceId],
    references: [gcpInstances.id]
  }),
  connection: one(connections, {
    fields: [gcpInstanceConnections.connectionId],
    references: [connections.id]
  })
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  gcpInstanceConnections: many(gcpInstanceConnections),
  gcpInstances: many(gcpInstances),
  playbooks: many(playbooks),
  awsClusterConnections: many(awsClusterConnections),
  awsClusters: many(awsClusters),
  connections: many(connections),
  connectionInfos: many(connectionInfo),
  integrations: many(integrations),
  projectMembers: many(projectMembers),
  scheduleRuns: many(scheduleRuns),
  schedules: many(schedules),
  chats: many(chats),
  artifactDocuments: many(artifactDocuments),
  artifactSuggestions: many(artifactSuggestions),
  messages: many(messages),
  messageVotes: many(messageVotes)
}));

export const gcpInstancesRelations = relations(gcpInstances, ({ one, many }) => ({
  gcpInstanceConnections: many(gcpInstanceConnections),
  project: one(projects, {
    fields: [gcpInstances.projectId],
    references: [projects.id]
  })
}));

export const connectionsRelations = relations(connections, ({ one, many }) => ({
  gcpInstanceConnections: many(gcpInstanceConnections),
  awsClusterConnections: many(awsClusterConnections),
  project: one(projects, {
    fields: [connections.projectId],
    references: [projects.id]
  }),
  connectionInfos: many(connectionInfo),
  schedules: many(schedules)
}));

export const playbooksRelations = relations(playbooks, ({ one }) => ({
  project: one(projects, {
    fields: [playbooks.projectId],
    references: [projects.id]
  })
}));

export const awsClusterConnectionsRelations = relations(awsClusterConnections, ({ one }) => ({
  project: one(projects, {
    fields: [awsClusterConnections.projectId],
    references: [projects.id]
  }),
  awsCluster: one(awsClusters, {
    fields: [awsClusterConnections.clusterId],
    references: [awsClusters.id]
  }),
  connection: one(connections, {
    fields: [awsClusterConnections.connectionId],
    references: [connections.id]
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
  project: one(projects, {
    fields: [connectionInfo.projectId],
    references: [projects.id]
  }),
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

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id]
  })
}));

export const scheduleRunsRelations = relations(scheduleRuns, ({ one }) => ({
  project: one(projects, {
    fields: [scheduleRuns.projectId],
    references: [projects.id]
  }),
  schedule: one(schedules, {
    fields: [scheduleRuns.scheduleId],
    references: [schedules.id]
  })
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  scheduleRuns: many(scheduleRuns),
  project: one(projects, {
    fields: [schedules.projectId],
    references: [projects.id]
  }),
  connection: one(connections, {
    fields: [schedules.connectionId],
    references: [connections.id]
  })
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  project: one(projects, {
    fields: [chats.projectId],
    references: [projects.id]
  }),
  messages: many(messages),
  messageVotes: many(messageVotes)
}));

export const artifactDocumentsRelations = relations(artifactDocuments, ({ one, many }) => ({
  project: one(projects, {
    fields: [artifactDocuments.projectId],
    references: [projects.id]
  }),
  artifactSuggestions: many(artifactSuggestions)
}));

export const artifactSuggestionsRelations = relations(artifactSuggestions, ({ one }) => ({
  project: one(projects, {
    fields: [artifactSuggestions.projectId],
    references: [projects.id]
  }),
  artifactDocument: one(artifactDocuments, {
    fields: [artifactSuggestions.documentId],
    references: [artifactDocuments.id]
  })
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  project: one(projects, {
    fields: [messages.projectId],
    references: [projects.id]
  }),
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id]
  }),
  messageVotes: many(messageVotes)
}));

export const messageVotesRelations = relations(messageVotes, ({ one }) => ({
  chat: one(chats, {
    fields: [messageVotes.chatId],
    references: [chats.id]
  }),
  message: one(messages, {
    fields: [messageVotes.messageId],
    references: [messages.id]
  }),
  project: one(projects, {
    fields: [messageVotes.projectId],
    references: [projects.id]
  })
}));
