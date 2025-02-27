import { MonitoringScheduleTable } from '~/components/monitoring/schedules-table';
import { listConnections } from '~/lib/db/connections';

async function getConnections() {
  const connections = await listConnections();
  return connections;
}

export default async function Page() {
  const connections = await getConnections();

  return (
    <div className="container">
      <MonitoringScheduleTable connections={connections} />
    </div>
  );
}
