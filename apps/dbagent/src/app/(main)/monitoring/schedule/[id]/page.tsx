import { actionListPlaybooks } from '~/components/monitoring/actions';
import { ScheduleForm } from '~/components/monitoring/schedule-form';

export default async function Page({ params }: { params: { id: string } }) {
  const playbooks = await actionListPlaybooks();
  return (
    <div className="container">
      <ScheduleForm scheduleId={params.id} playbooks={playbooks} />
    </div>
  );
}
