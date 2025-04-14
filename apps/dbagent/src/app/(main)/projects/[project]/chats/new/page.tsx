import { redirect } from 'next/navigation';
import { auth } from '~/auth';
import { generateUUID } from '~/components/chat/utils';
import { saveChat } from '~/lib/db/chats';
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

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Unauthorized');

  const chatId = generateUUID();
  const dbAccess = await getUserSessionDBAccess();

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
      title: ''
    });
  }

  redirect(`/projects/${project}/chats/${chatId}`);
}
