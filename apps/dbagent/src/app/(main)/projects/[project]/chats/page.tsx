import { getProjectConnectionList } from '~/app/(main)/projects/[project]/actions';
import { actionGetScheduleRun } from '~/components/chats/actions';
import { ChatsUI } from '~/components/chats/chats-ui';

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

  const connections = await getProjectConnectionList(project);
  const scheduleRun = await actionGetScheduleRun(runId);

  return <ChatsUI connections={connections} scheduleRun={scheduleRun} />;
}
