import { ScheduleRunsTable } from '~/components/monitoring/schedule-runs-table';
import { getSchedule } from '~/lib/db/schedules';

interface PageParams {
  schedule: string;
}

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { schedule: scheduleId } = await params;
  const schedule = await getSchedule(scheduleId);

  return (
    <div className="container">
      <ScheduleRunsTable schedule={schedule} />
    </div>
  );
}
