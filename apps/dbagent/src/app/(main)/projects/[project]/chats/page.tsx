import { actionGetScheduleRun } from '~/components/chats/actions';
import { ChatsUI } from '~/components/chats/chats-ui';
import { listConnections } from '~/lib/db/connections';

interface SearchParams {
  runId?: string;
}

export default async function Page({
  params,
  searchParams
}: {
  params: { project: string };
  searchParams: Promise<SearchParams>;
}) {
  const { runId } = await searchParams;

  const connections = await listConnections(params.project);
  const scheduleRun = await actionGetScheduleRun(runId);

  return (
    <div className="container">
      <ChatsUI connections={connections} scheduleRun={scheduleRun} />
    </div>
  );
}
