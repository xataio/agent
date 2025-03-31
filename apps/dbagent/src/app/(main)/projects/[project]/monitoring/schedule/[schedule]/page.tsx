import { getProjectConnectionList } from '~/app/(main)/projects/[project]/actions';
import { actionListPlaybooks } from '~/components/monitoring/actions';
import { ScheduleForm } from '~/components/monitoring/schedule-form';

export default async function Page({ params }: { params: Promise<{ project: string; schedule: string }> }) {
  const { project, schedule } = await params;

  const playbooks = await actionListPlaybooks();
  const connections = await getProjectConnectionList(project);

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
