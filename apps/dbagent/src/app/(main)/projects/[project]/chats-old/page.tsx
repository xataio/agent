import { actionGetScheduleRun } from '~/components/chats/actions';
import { ChatsUI } from '~/components/chats/chats-ui';
import { listConnections } from '~/lib/db/connections';

type PageParams = {
  project: string;
};

type SearchParams = {
  runId?: string;
};

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { project } = await params;
  const { runId } = await searchParams;

  const connections = await listConnections(project);
  const scheduleRun = await actionGetScheduleRun(runId);

  return <ChatsUI connections={connections} scheduleRun={scheduleRun} />;
}
