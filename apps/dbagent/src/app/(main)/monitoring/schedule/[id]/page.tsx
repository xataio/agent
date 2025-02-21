import { actionListConnections } from '~/components/connections/actions';
import { actionListPlaybooks } from '~/components/monitoring/actions';
import { ScheduleForm } from '~/components/monitoring/schedule-form';

export default async function Page({ params }: { params: { id: string; connection?: string } }) {
  const playbooks = await actionListPlaybooks();
  const connections = await actionListConnections();
  return (
    <div className="container">
      <ScheduleForm
        scheduleId={params.id}
        playbooks={playbooks}
        connections={connections}
        connection={params.connection}
      />
    </div>
  );
}
