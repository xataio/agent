'use server';

import { Message } from 'ai';
import { desc, eq } from 'drizzle-orm';
import { queryDb } from './db';
import { chats, messages } from './schema';

export type Chat = {
  id: string;
  projectId: string;
  connectionId?: string;
  title?: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  message: Message;
  createdAt: string;
};

export async function createChat({
  projectId,
  connectionId,
  title,
  createdAt
}: Omit<Chat, 'id' | 'createdAt'> & { createdAt?: string }): Promise<Chat> {
  return queryDb(async ({ db }) => {
    const results = await db
      .insert(chats)
      .values({
        projectId,
        title,
        connectionId: connectionId || null,
        createdAt
      })
      .returning();

    return results[0] as Chat;
  });
}

export async function getChatById(id: string): Promise<Chat | null> {
  return queryDb(async ({ db }) => {
    const results = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    if (!results[0]) return null;
    const result = results[0];
    return {
      id: result.id,
      projectId: result.projectId,
      connectionId: result.connectionId || undefined,
      title: result.title || undefined,
      createdAt: result.createdAt
    };
  });
}

export async function listChats(projectId: string): Promise<Chat[]> {
  return queryDb(async ({ db }) => {
    const results = await db.select().from(chats).where(eq(chats.projectId, projectId));
    return results.map((result) => ({
      id: result.id,
      projectId: result.projectId,
      connectionId: result.connectionId || undefined,
      title: result.title || undefined,
      createdAt: result.createdAt
    }));
  });
}

export async function updateChat(id: string, title?: string, connectionId?: string): Promise<Chat> {
  return queryDb(async ({ db }) => {
    const updateValues: { title?: string; connectionId?: string | null } = {};
    if (title !== undefined) updateValues.title = title;
    if (connectionId !== undefined) updateValues.connectionId = connectionId;
    const results = await db.update(chats).set(updateValues).where(eq(chats.id, id)).returning();
    return results[0] as Chat;
  });
}

export async function deleteChat(id: string): Promise<void> {
  return queryDb(async ({ db }) => {
    await db.delete(chats).where(eq(chats.id, id));
  });
}

export async function deleteProjectChats(projectId: string): Promise<void> {
  return queryDb(async ({ db }) => {
    await db.delete(chats).where(eq(chats.projectId, projectId));
  });
}

export async function storeMessages(
  chatId: string,
  list: (Omit<ChatMessage, 'id'> & { id?: string })[]
): Promise<ChatMessage[]> {
  return queryDb(async ({ db }) => {
    const messageList = list.map((m) => ({
      chatId,
      message: m.message,
      id: m.id ?? crypto.randomUUID(),
      createdAt: m.createdAt ? m.createdAt : new Date().toISOString()
    }));

    const results = await db.insert(messages).values(messageList).returning();
    return results;
  });
}

export async function listChatMessages(chatId: string, limit?: number): Promise<ChatMessage[]> {
  return queryDb(async ({ db }) => {
    // Fetch messages and order them by the level field
    const results = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(limit ?? 999999);
    return results;
  });
}
