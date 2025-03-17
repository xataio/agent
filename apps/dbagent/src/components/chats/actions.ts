'use server';

import { ChatMemory, Memory } from '~/lib/ai/memory';
import { getScheduleRun } from '~/lib/db/schedule-runs';
import { getSchedule } from '~/lib/db/schedules';

export async function actionGetScheduleRun(runId?: string) {
  if (!runId) return null;

  try {
    const run = await getScheduleRun(runId);
    const schedule = await getSchedule(run.scheduleId);
    return { schedule, run };
  } catch (error) {
    return null;
  }
}

export async function actionCreateChat(projectId: string, title: string, connectionId?: string) {
  const memory = new Memory(projectId);
  const newChat = await memory.saveChat({
    title: title !== '' ? title : 'New Conversation',
    connectionId: connectionId,
    createdAt: new Date()
  });
  return newChat;
}

export async function actionDeleteChat(projectId: string, chatId: string) {
  const memory = new Memory(projectId);
  await memory.deleteChat(chatId);
}

export async function actionUpdateChat(
  projectId: string,
  chatId: string,
  { title, connectionId }: { title?: string; connectionId?: string }
) {
  const memory = new Memory(projectId);
  const updatedChat = await memory.updateChat(chatId, title, connectionId);
  return updatedChat;
}

export async function actionListChats(projectId: string) {
  const memory = new Memory(projectId);
  return memory.listChats();
}

export async function actionGetChatMessages(chatId: string, limit?: number) {
  const memory = new ChatMemory(chatId);
  return memory.getMessages(limit);
}
