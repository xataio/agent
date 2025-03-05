import { MonitoringScheduleTable } from '~/components/monitoring/schedules-table';
import { listConnections } from '~/lib/db/connections';

export default async function Page() {
  const connections = await listConnections();

  return (
    <div className="container">
      <MonitoringScheduleTable connections={connections} />
    </div>
  );
}
