import { redirect } from 'next/navigation';
import { generateUUID } from '~/components/chat/utils';
import { saveChat, saveMessages } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getScheduleRun } from '~/lib/db/schedule-runs';
import { getSchedule } from '~/lib/db/schedules';

type PageParams = {
  project: string;
};

type SearchParams = {
  scheduleRun?: string;
};

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { project } = await params;
  const { scheduleRun } = await searchParams;
  const chatId = generateUUID();

  if (scheduleRun) {
    const dbAccess = await getUserSessionDBAccess();
    const run = await getScheduleRun(dbAccess, scheduleRun);
    const schedule = await getSchedule(dbAccess, run.scheduleId);

    await saveChat(dbAccess, {
      id: chatId,
      projectId: run.projectId,
      userId: schedule.userId,
      model: schedule.model,
      title: `Schedule: ${schedule.playbook} - Run: ${run.id}`
    });

    await saveMessages(dbAccess, {
      messages: run.messages.map((message) => ({
        chatId,
        projectId: run.projectId,
        role: message.role,
        parts:
          message.parts ??
          (message.content?.split('\n\n').map((text) => ({
            type: 'text',
            text
          })) ||
            [])
      }))
    });
  }

  redirect(`/projects/${project}/chats/${chatId}`);
}
