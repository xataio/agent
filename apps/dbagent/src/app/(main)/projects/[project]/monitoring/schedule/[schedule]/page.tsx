import { actionListPlaybooks } from '~/components/monitoring/actions';
import { ScheduleForm } from '~/components/monitoring/schedule-form';
import { actionListCustomPlaybooksNames } from '~/components/playbooks/action';
import { listConnections } from '~/lib/db/connections';

type PageParams = {
  project: string;
  schedule: string;
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { project, schedule } = await params;

  const builtInPlaybooks = await actionListPlaybooks();
  const customPlaybooks = (await actionListCustomPlaybooksNames(project)) ?? [];
  const playbooks = [...builtInPlaybooks, ...customPlaybooks];

  const connections = await listConnections(project);

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
