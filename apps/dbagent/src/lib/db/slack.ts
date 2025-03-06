import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { slackConversations, slackMemory, slackUserLinks, slackUserProjects, slackUsers } from './schema';

export async function getOrCreateSlackUser(
  slackUserId: string,
  slackTeamId: string,
  email?: string,
  displayName?: string
) {
  const existingUser = await db
    .select()
    .from(slackUsers)
    .where(and(eq(slackUsers.slackUserId, slackUserId), eq(slackUsers.slackTeamId, slackTeamId)))
    .limit(1);

  if (existingUser.length > 0) {
    return existingUser[0];
  }

  const [newUser] = await db
    .insert(slackUsers)
    .values({
      slackUserId,
      slackTeamId,
      email,
      displayName
    })
    .returning();

  return newUser;
}

export async function linkUserToPlatform(slackUserId: string, platformUserId: string) {
  const [link] = await db
    .insert(slackUserLinks)
    .values({
      slackUserId,
      platformUserId
    })
    .onConflictDoNothing()
    .returning();

  return link;
}

export async function getPlatformUserId(slackUserId: string) {
  const result = await db
    .select()
    .from(slackUserLinks)
    .where(eq(slackUserLinks.slackUserId, slackUserId))
    .limit(1);

  return result[0]?.platformUserId;
}

export async function getOrCreateSlackConversation(slackChannelId: string, slackTeamId: string, projectId: string) {
  const existingConversation = await db
    .select()
    .from(slackConversations)
    .where(and(eq(slackConversations.slackChannelId, slackChannelId), eq(slackConversations.slackTeamId, slackTeamId)))
    .limit(1);

  if (existingConversation.length > 0) {
    return existingConversation[0];
  }

  const [newConversation] = await db
    .insert(slackConversations)
    .values({
      slackChannelId,
      slackTeamId,
      projectId
    })
    .returning();

  return newConversation;
}

export async function linkUserToProject(slackUserId: string, projectId: string) {
  const [link] = await db
    .insert(slackUserProjects)
    .values({
      slackUserId,
      projectId
    })
    .onConflictDoNothing()
    .returning();

  return link;
}

export async function getUserProjects(slackUserId: string) {
  return db
    .select()
    .from(slackUserProjects)
    .where(eq(slackUserProjects.slackUserId, slackUserId));
}

export async function setMemoryValue(slackUserId: string, conversationId: string, key: string, value: any) {
  await db
    .insert(slackMemory)
    .values({
      slackUserId,
      conversationId,
      key,
      value
    })
    .onConflictDoUpdate({
      target: [slackMemory.slackUserId, slackMemory.conversationId, slackMemory.key],
      set: {
        value,
        updatedAt: new Date()
      }
    });
}

export async function getMemoryValue<T>(slackUserId: string, conversationId: string, key: string) {
  const result = await db
    .select()
    .from(slackMemory)
    .where(
      and(
        eq(slackMemory.slackUserId, slackUserId),
        eq(slackMemory.conversationId, conversationId),
        eq(slackMemory.key, key)
      )
    )
    .limit(1);

  return result[0]?.value as T;
}

export async function deleteMemoryValue(slackUserId: string, conversationId: string, key: string) {
  await db
    .delete(slackMemory)
    .where(
      and(
        eq(slackMemory.slackUserId, slackUserId),
        eq(slackMemory.conversationId, conversationId),
        eq(slackMemory.key, key)
      )
    );
}