import { actionGetScheduleRun } from '~/components/chats/actions';
import { ChatsUI } from '~/components/chats/chats-ui';
import { listConnections } from '~/lib/db/connections';

type Params = {
  project: string;
};

type SearchParams = {
  runId?: string;
};

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { project } = await params;
  const { runId } = await searchParams;

  const connections = await listConnections(project);
  const scheduleRun = await actionGetScheduleRun(runId);

  return (
    <div className="container">
      <ChatsUI connections={connections} scheduleRun={scheduleRun} />
    </div>
  );
}
