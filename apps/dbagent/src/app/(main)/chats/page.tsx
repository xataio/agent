'use server';

import { actionGetScheduleRun } from '~/components/chats/actions';
import { ChatsUI } from '~/components/chats/chats-ui';
import { listConnections } from '~/lib/db/connections';
import { ScheduleRun } from '~/lib/db/runs';
import { Schedule } from '~/lib/db/schedules';

async function getConnections() {
  const connections = await listConnections();
  return connections;
}

interface SearchParams {
  runId?: string;
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { runId } = await searchParams;
  const connections = await getConnections();
  console.log('runId', runId);

  let scheduleRun: { schedule: Schedule; run: ScheduleRun } | undefined;
  if (runId) {
    try {
      scheduleRun = await actionGetScheduleRun(runId);
    } catch (error) {
      console.error('Error getting schedule run', error);
    }
  }

  return (
    <div className="container">
      <ChatsUI connections={connections} scheduleRun={scheduleRun} />
    </div>
  );
}
