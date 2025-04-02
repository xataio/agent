import { getProjectSchedule } from '~/app/(main)/projects/[project]/actions';
import { ScheduleRunsTable } from '~/components/monitoring/schedule-runs-table';

interface PageParams {
  schedule: string;
}

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { schedule: scheduleId } = await params;
  const schedule = await getProjectSchedule(scheduleId);

  return (
    <div className="container">
      <ScheduleRunsTable schedule={schedule} />
    </div>
  );
}
