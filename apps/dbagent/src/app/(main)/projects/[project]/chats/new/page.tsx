import { redirect } from 'next/navigation';
import { generateUUID } from '~/components/chat/utils';
import { saveChat } from '~/lib/db/chats';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { getScheduleRun } from '~/lib/db/schedule-runs';
import { getSchedule } from '~/lib/db/schedules';
import { requireUserSession } from '~/utils/route';

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

  const userId = await requireUserSession();
  const dbAccess = await getUserSessionDBAccess();
  const chatId = generateUUID();

  if (scheduleRun) {
    const run = await getScheduleRun(dbAccess, scheduleRun);
    const schedule = await getSchedule(dbAccess, run.scheduleId);

    await saveChat(
      dbAccess,
      {
        id: chatId,
        projectId: project,
        userId: schedule.userId,
        model: schedule.model,
        title: `Schedule: ${schedule.playbook} - Run: ${run.id}`
      },
      run.messages.map((message) => ({
        chatId,
        projectId: project,
        role: message.role,
        parts:
          message.parts ??
          (message.content?.split('\n\n').map((text) => ({
            type: 'text',
            text
          })) ||
            [])
      }))
    );
  } else {
    await saveChat(dbAccess, {
      id: chatId,
      projectId: project,
      userId,
      model: 'chat',
      title: 'New chat'
    });
  }

  redirect(`/projects/${project}/chats/${chatId}`);
}
