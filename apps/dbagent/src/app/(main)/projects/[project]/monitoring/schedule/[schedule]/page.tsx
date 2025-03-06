import { actionListPlaybooks } from '~/components/monitoring/actions';
import { ScheduleForm } from '~/components/monitoring/schedule-form';
import { listConnections } from '~/lib/db/connections';

interface PageParams {
  project: string;
  schedule: string;
}

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project, schedule } = await params;

  const playbooks = await actionListPlaybooks();
  const connections = await listConnections();

  return (
    <div className="container">
      {schedule === 'add' ? (
        <ScheduleForm isEditMode={false} projectId={project} playbooks={playbooks} connections={connections} />
      ) : (
        <ScheduleForm
          isEditMode={true}
          projectId={project}
          scheduleId={schedule}
          playbooks={playbooks}
          connections={connections}
        />
      )}
    </div>
  );
}
