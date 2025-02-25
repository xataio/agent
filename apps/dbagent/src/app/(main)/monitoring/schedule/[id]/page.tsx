import { actionListConnections } from '~/components/connections/actions';
import { actionListPlaybooks } from '~/components/monitoring/actions';
import { ScheduleForm } from '~/components/monitoring/schedule-form';

interface PageParams {
  id: string;
  connection?: string;
}

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const playbooks = await actionListPlaybooks();
  const connections = await actionListConnections();
  const { id, connection } = await params;
  return (
    <div className="container">
      <ScheduleForm scheduleId={id} playbooks={playbooks} connections={connections} connection={connection} />
    </div>
  );
}
