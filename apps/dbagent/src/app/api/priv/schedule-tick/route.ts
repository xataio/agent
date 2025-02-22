import { SchedulerService } from '~/lib/services/scheduler';

export async function POST() {
  const scheduler = new SchedulerService();
  await scheduler.checkAndRunJobs();
  return new Response('OK', { status: 200 });
}
