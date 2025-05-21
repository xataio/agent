import 'server-only';

import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { ArtifactKind } from '~/components/chat/artifacts/artifact';
import { compactObject } from '~/utils/types';
import { DBAccess } from './db';
import {
  artifactDocuments,
  artifactSuggestions,
  ChatInsert,
  chats,
  Message,
  MessageInsert,
  messages,
  messageVotes,
  type ArtifactSuggestion
} from './schema';

export async function saveChat(dbAccess: DBAccess, chat: ChatInsert, chatMessages: Array<MessageInsert> = []) {
  return dbAccess.query(async ({ db }) => {
    return await db.transaction(async (tx) => {
      const result = await tx
        .insert(chats)
        .values(chat)
        .onConflictDoUpdate({
          target: [chats.id],
          set: compactObject({
            model: chat.model,
            title: chat.title,
            connectionId: chat.connectionId
          })
        });

      if (chatMessages.length > 0) {
        await tx.insert(messages).values(chatMessages).onConflictDoNothing();
      }

      return result;
    });
  });
}

export async function deleteChatById(dbAccess: DBAccess, { id }: { id: string }) {
  return dbAccess.query(async ({ db }) => {
    return await db.delete(chats).where(eq(chats.id, id));
  });
}

export async function getChatsByProject(
  dbAccess: DBAccess,
  {
    project,
    limit = 100,
    offset = 0
  }: {
    project: string;
    limit?: number;
    offset?: number;
  }
) {
  return dbAccess.query(async ({ db }) => {
    return await db
      .select()
      .from(chats)
      .where(eq(chats.projectId, project))
      .orderBy(desc(chats.createdAt))
      .limit(limit)
      .offset(offset);
  });
}

export async function getChatById(dbAccess: DBAccess, { id }: { id: string }) {
  return dbAccess.query(async ({ db }) => {
    const [selectedChat] = await db
      .select({
        id: chats.id,
        projectId: chats.projectId,
        createdAt: chats.createdAt,
        title: chats.title,
        model: chats.model,
        userId: chats.userId,
        connectionId: chats.connectionId
      })
      .from(chats)
      .where(eq(chats.id, id));
    return selectedChat;
  });
}

export async function getMessagesByChatId(dbAccess: DBAccess, { id }: { id: string }) {
  return dbAccess.query(async ({ db }) => {
    const result = await db
      .select({
        chat: {
          id: chats.id,
          title: chats.title,
          model: chats.model,
          connectionId: chats.connectionId
        },
        messages: messages
      })
      .from(chats)
      .leftJoin(messages, eq(messages.chatId, chats.id))
      .where(eq(chats.id, id))
      .orderBy(asc(messages.createdAt));

    return {
      ...result[0]?.chat,
      messages: result.map((row) => row.messages).filter(Boolean) as Array<Message>
    };
  });
}

export async function voteMessage(
  dbAccess: DBAccess,
  {
    chatId,
    messageId,
    projectId,
    userId,
    type
  }: {
    chatId: string;
    messageId: string;
    userId: string;
    projectId: string;
    type: 'up' | 'down';
  }
) {
  return dbAccess.query(async ({ db }) => {
    return await db.transaction(async (tx) => {
      const [existingVote] = await tx
        .select()
        .from(messageVotes)
        .where(and(eq(messageVotes.messageId, messageId), eq(messageVotes.chatId, chatId)));

      if (existingVote) {
        await tx
          .update(messageVotes)
          .set({ isUpvoted: type === 'up' })
          .where(and(eq(messageVotes.messageId, messageId), eq(messageVotes.chatId, chatId)));
      } else {
        await tx.insert(messageVotes).values({
          chatId,
          messageId,
          projectId,
          userId,
          isUpvoted: type === 'up'
        });
      }
      return { success: true };
    });
  });
}

export async function getVotesByChatId(dbAccess: DBAccess, { id }: { id: string }) {
  return dbAccess.query(async ({ db }) => {
    return await db.select().from(messageVotes).where(eq(messageVotes.chatId, id));
  });
}

export async function saveDocument(
  dbAccess: DBAccess,
  {
    id,
    title,
    kind,
    content,
    userId,
    projectId
  }: {
    id: string;
    title: string;
    kind: ArtifactKind;
    content: string;
    userId: string;
    projectId: string;
  }
) {
  return dbAccess.query(async ({ db }) => {
    return await db
      .insert(artifactDocuments)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
        projectId
      })
      .onConflictDoUpdate({
        target: [artifactDocuments.id],
        set: {
          title,
          kind,
          content
        }
      });
  });
}

export async function getDocumentsById(dbAccess: DBAccess, { id }: { id: string }) {
  return dbAccess.query(async ({ db }) => {
    const items = await db
      .select()
      .from(artifactDocuments)
      .where(eq(artifactDocuments.id, id))
      .orderBy(asc(artifactDocuments.createdAt));

    return items;
  });
}

export async function getDocumentById(dbAccess: DBAccess, { id }: { id: string }) {
  return dbAccess.query(async ({ db }) => {
    const [selectedDocument] = await db
      .select()
      .from(artifactDocuments)
      .where(eq(artifactDocuments.id, id))
      .orderBy(desc(artifactDocuments.createdAt));

    return selectedDocument;
  });
}

export async function deleteDocumentsByIdAfterTimestamp(
  dbAccess: DBAccess,
  { id, timestamp }: { id: string; timestamp: Date }
) {
  return dbAccess.query(async ({ db }) => {
    return await db
      .delete(artifactDocuments)
      .where(and(eq(artifactDocuments.id, id), gt(artifactDocuments.createdAt, timestamp)));
  });
}

export async function saveSuggestions(
  dbAccess: DBAccess,
  { suggestions: items }: { suggestions: Array<ArtifactSuggestion> }
) {
  return dbAccess.query(async ({ db }) => {
    return await db.insert(artifactSuggestions).values(items);
  });
}

export async function getSuggestionsByDocumentId(dbAccess: DBAccess, { documentId }: { documentId: string }) {
  return dbAccess.query(async ({ db }) => {
    return await db
      .select()
      .from(artifactSuggestions)
      .where(and(eq(artifactSuggestions.documentId, documentId)));
  });
}

export async function getMessageById(dbAccess: DBAccess, { id }: { id: string }) {
  return dbAccess.query(async ({ db }) => {
    return await db.select().from(messages).where(eq(messages.id, id));
  });
}

export async function deleteMessagesByChatIdAfterTimestamp(
  dbAccess: DBAccess,
  { chatId, timestamp }: { chatId: string; timestamp: Date }
) {
  return dbAccess.query(async ({ db }) => {
    return await db.transaction(async (tx) => {
      const messagesToDelete = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.chatId, chatId), gte(messages.createdAt, timestamp)));

      const messageIds = messagesToDelete.map((message) => message.id);

      if (messageIds.length > 0) {
        await tx
          .delete(messageVotes)
          .where(and(eq(messageVotes.chatId, chatId), inArray(messageVotes.messageId, messageIds)));

        await tx.delete(messages).where(and(eq(messages.chatId, chatId), inArray(messages.id, messageIds)));
      }

      return { success: true, deletedCount: messageIds.length };
    });
  });
}
