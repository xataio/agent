import { MonitoringScheduleTable } from '~/components/monitoring/schedules-table';
import { listConnections } from '~/lib/db/connections';

type PageParams = {
  project: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project } = await params;
  const connections = await listConnections(project);

  return (
    <div className="container">
      <MonitoringScheduleTable connections={connections} />
    </div>
  );
}
