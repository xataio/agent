import { MonitoringScheduleTable } from '~/components/monitoring/schedules-table';
import { getProjectConnectionList } from '../actions';

export default async function Page({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;

  const connections = await getProjectConnectionList(project);

  return (
    <div className="container">
      <MonitoringScheduleTable connections={connections} />
    </div>
  );
}
