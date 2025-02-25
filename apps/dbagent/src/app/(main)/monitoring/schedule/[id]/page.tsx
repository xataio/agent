import { actionListConnections } from '~/components/connections/actions';
import { actionListPlaybooks } from '~/components/monitoring/actions';
import { ScheduleForm } from '~/components/monitoring/schedule-form';

export default async function Page({ params }: { params: { id: string; connection?: string; add: string } }) {
  const playbooks = await actionListPlaybooks();
  const connections = await actionListConnections();
  return (
    <div className="container">
      <ScheduleForm
        isEditMode={!!params.add}
        scheduleId={parseInt(params.id, 10)}
        playbooks={playbooks}
        connections={connections}
        connection={params.connection}
      />
    </div>
  );
}
