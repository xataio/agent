import { getProjectConnectionList } from '~/app/(main)/projects/[project]/actions';
import { actionListPlaybooks } from '~/components/monitoring/actions';
import { ScheduleForm } from '~/components/monitoring/schedule-form';
import { actionListCustomPlaybooksNames } from '~/components/playbooks/action';

export default async function Page({ params }: { params: Promise<{ project: string; schedule: string }> }) {
  const { project, schedule } = await params;

  const builtInPlaybooks = await actionListPlaybooks();
  const customPlaybooks = (await actionListCustomPlaybooksNames(project)) ?? [];
  const playbooks = [...builtInPlaybooks, ...customPlaybooks];

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
