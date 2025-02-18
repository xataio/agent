import { ScheduleForm } from '~/components/monitoring/schedule-form';
export default async function Page({ params }: { params: { id: string } }) {
  return (
    <div className="container">
      <ScheduleForm action="edit" scheduleId={params.id} />
    </div>
  );
}
