import 'server-only';

import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';

import { ArtifactKind } from '~/components/chat/artifact';
import { queryDb } from './db';
import { chats, documents, Message, messages, type Suggestion, suggestions, votes } from './schema';

export async function saveChat({
  id,
  projectId,
  userId,
  title
}: {
  id: string;
  projectId: string;
  userId: string;
  title: string;
}) {
  return queryDb(async ({ db }) => {
    return await db.insert(chats).values({
      id,
      projectId,
      createdAt: new Date(),
      userId,
      title
    });
  });
}

export async function deleteChatById({ id }: { id: string }) {
  return queryDb(async ({ db }) => {
    await db.delete(votes).where(eq(votes.chatId, id));
    await db.delete(messages).where(eq(messages.chatId, id));

    return await db.delete(chats).where(eq(chats.id, id));
  });
}

export async function getChatsByUserId({ id }: { id: string }) {
  return queryDb(async ({ db }) => {
    return await db.select().from(chats).where(eq(chats.userId, id)).orderBy(desc(chats.createdAt));
  });
}

export async function getChatById({ id }: { id: string }) {
  return queryDb(async ({ db }) => {
    const [selectedChat] = await db.select().from(chats).where(eq(chats.id, id));
    return selectedChat;
  });
}

export async function saveMessages({ messages: items }: { messages: Array<Message> }) {
  return queryDb(async ({ db }) => {
    return await db.insert(messages).values(items);
  });
}

export async function getMessagesByChatId({ id }: { id: string }) {
  return await queryDb(async ({ db }) => {
    return await db.select().from(messages).where(eq(messages.chatId, id)).orderBy(asc(messages.createdAt));
  });
}

export async function voteMessage({
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
}) {
  return queryDb(async ({ db }) => {
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(votes)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(votes.messageId, messageId), eq(votes.chatId, chatId)));
    }
    return await db.insert(votes).values({
      chatId,
      messageId,
      projectId,
      userId,
      isUpvoted: type === 'up'
    });
  });
}

export async function getVotesByChatId({ id }: { id: string }) {
  return queryDb(async ({ db }) => {
    return await db.select().from(votes).where(eq(votes.chatId, id));
  });
}

export async function saveDocument({
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
}) {
  return queryDb(async ({ db }) => {
    return await db.insert(documents).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
      projectId
    });
  });
}

export async function getDocumentsById({ id }: { id: string }) {
  return queryDb(async ({ db }) => {
    const items = await db.select().from(documents).where(eq(documents.id, id)).orderBy(asc(documents.createdAt));

    return items;
  });
}

export async function getDocumentById({ id }: { id: string }) {
  return queryDb(async ({ db }) => {
    const [selectedDocument] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .orderBy(desc(documents.createdAt));

    return selectedDocument;
  });
}

export async function deleteDocumentsByIdAfterTimestamp({ id, timestamp }: { id: string; timestamp: Date }) {
  return queryDb(async ({ db }) => {
    await db
      .delete(suggestions)
      .where(and(eq(suggestions.documentId, id), gt(suggestions.documentCreatedAt, timestamp)));

    return await db.delete(documents).where(and(eq(documents.id, id), gt(documents.createdAt, timestamp)));
  });
}

export async function saveSuggestions({ items }: { items: Array<Suggestion> }) {
  return queryDb(async ({ db }) => {
    return await db.insert(suggestions).values(items);
  });
}

export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
  return queryDb(async ({ db }) => {
    return await db
      .select()
      .from(suggestions)
      .where(and(eq(suggestions.documentId, documentId)));
  });
}

export async function getMessageById({ id }: { id: string }) {
  return queryDb(async ({ db }) => {
    return await db.select().from(messages).where(eq(messages.id, id));
  });
}

export async function deleteMessagesByChatIdAfterTimestamp({ chatId, timestamp }: { chatId: string; timestamp: Date }) {
  return queryDb(async ({ db }) => {
    const messagesToDelete = await db
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.chatId, chatId), gte(messages.createdAt, timestamp)));

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db.delete(votes).where(and(eq(votes.chatId, chatId), inArray(votes.messageId, messageIds)));

      return await db.delete(messages).where(and(eq(messages.chatId, chatId), inArray(messages.id, messageIds)));
    }
  });
}
