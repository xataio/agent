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
  playbook?: string;
  start?: string;
  tool?: string;
};

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { project } = await params;
  const { scheduleRun, playbook, start, tool } = await searchParams;

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
        id: generateUUID(),
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
  } else if (playbook) {
    await saveChat(
      dbAccess,
      {
        id: chatId,
        projectId: project,
        userId,
        model: 'chat',
        title: `Playbook ${playbook}`
      },
      [
        {
          id: generateUUID(),
          chatId,
          projectId: project,
          role: 'user',
          parts: [
            {
              type: 'text',
              text: `Run playbook ${playbook}`
            }
          ]
        }
      ]
    );
  } else if (tool) {
    await saveChat(
      dbAccess,
      {
        id: chatId,
        projectId: project,
        userId,
        model: 'chat',
        title: `Tool ${tool}`
      },
      [
        {
          id: generateUUID(),
          chatId,
          projectId: project,
          role: 'user',
          parts: [
            {
              type: 'text',
              text: `Run tool ${tool}`
            }
          ]
        }
      ]
    );
  } else if (start) {
    await saveChat(
      dbAccess,
      {
        id: chatId,
        projectId: project,
        userId,
        model: 'chat',
        title: `New chat`
      },
      [
        {
          id: generateUUID(),
          chatId,
          projectId: project,
          role: 'user',
          parts: [
            {
              type: 'text',
              text: `Hi! I'd like an initial assessment of my database. Please analyze its configuration, settings, and current activity to provide recommendations for optimization and potential improvements.`
            }
          ]
        }
      ]
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
