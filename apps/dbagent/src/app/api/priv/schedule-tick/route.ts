import { checkAndRunJobs } from '~/lib/monitoring/scheduler';

export async function POST() {
  await checkAndRunJobs();
  return new Response('OK', { status: 200 });
}
